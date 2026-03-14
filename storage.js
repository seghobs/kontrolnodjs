const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const config = require('./config');

let db = null;

function connect() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(config.DB_FILE, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function initDb() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(
                `CREATE TABLE IF NOT EXISTS tokens (
                    username TEXT PRIMARY KEY,
                    full_name TEXT DEFAULT '',
                    password TEXT DEFAULT '',
                    token TEXT DEFAULT '',
                    android_id_yeni TEXT DEFAULT '',
                    user_agent TEXT DEFAULT '',
                    device_id TEXT DEFAULT '',
                    is_active INTEGER DEFAULT 1,
                    added_at TEXT DEFAULT '',
                    logout_reason TEXT DEFAULT '',
                    logout_time TEXT DEFAULT ''
                )`,
                (err) => {
                    if (err) reject(err);
                }
            );

            db.run(
                `CREATE TABLE IF NOT EXISTS exemptions (
                    post_link TEXT NOT NULL,
                    username TEXT NOT NULL,
                    PRIMARY KEY (post_link, username)
                )`,
                (err) => {
                    if (err) reject(err);
                }
            );

            db.run(
                `CREATE TABLE IF NOT EXISTS key_value (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )`,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    });
}

function jsonRead(path, defaultValue) {
    try {
        if (!fs.existsSync(path)) {
            return defaultValue;
        }
        const data = fs.readFileSync(path, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`JSON okuma hatasi ${path}:`, error);
        return defaultValue;
    }
}

function migrateFromJson() {
    return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as c FROM tokens", (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            if (row.c > 0) {
                resolve();
                return;
            }

            db.serialize(() => {
                const tokensPayload = jsonRead(config.TOKENS_FILE, []);
                if (Array.isArray(tokensPayload)) {
                    const stmt = db.prepare(`INSERT OR REPLACE INTO tokens (
                        username, full_name, password, token, android_id_yeni,
                        user_agent, device_id, is_active, added_at, logout_reason, logout_time
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                    tokensPayload.forEach(token => {
                        stmt.run(
                            token.username || '',
                            token.full_name || '',
                            token.password || '',
                            token.token || '',
                            token.android_id_yeni || '',
                            token.user_agent || '',
                            token.device_id || '',
                            token.is_active ? 1 : 0,
                            token.added_at || '',
                            token.logout_reason || '',
                            token.logout_time || ''
                        );
                    });

                    stmt.finalize();
                }

                const exemptionsPayload = jsonRead(config.EXEMPTIONS_FILE, {});
                if (typeof exemptionsPayload === 'object' && exemptionsPayload !== null) {
                    const stmt = db.prepare("INSERT OR IGNORE INTO exemptions (post_link, username) VALUES (?, ?)");

                    Object.entries(exemptionsPayload).forEach(([postLink, usernames]) => {
                        if (Array.isArray(usernames)) {
                            usernames.forEach(username => {
                                stmt.run(postLink, username);
                            });
                        }
                    });

                    stmt.finalize();
                }

                const tokenPayload = jsonRead(config.TOKEN_FILE, {});
                if (Object.keys(tokenPayload).length > 0) {
                    db.run(
                        "INSERT OR REPLACE INTO key_value (key, value) VALUES (?, ?)",
                        ['legacy_token_data', JSON.stringify(tokenPayload)],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                } else {
                    resolve();
                }
            });
        });
    });
}

async function initStorage() {
    try {
        await connect();
        await initDb();
        await migrateFromJson();
        console.log('Veritabani baslatildi');
    } catch (error) {
        console.error('Veritabani baslatma hatasi:', error);
        throw error;
    }
}

function loadTokens() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM tokens ORDER BY rowid ASC", (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            const tokens = rows.map(row => {
                const item = { ...row };
                item.is_active = Boolean(item.is_active);
                if (!item.logout_reason) {
                    delete item.logout_reason;
                }
                if (!item.logout_time) {
                    delete item.logout_time;
                }
                return item;
            });

            resolve(tokens);
        });
    });
}

function saveTokens(tokens) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("DELETE FROM tokens", (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                const stmt = db.prepare(`INSERT INTO tokens (
                    username, full_name, password, token, android_id_yeni,
                    user_agent, device_id, is_active, added_at, logout_reason, logout_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                tokens.forEach(token => {
                    stmt.run(
                        token.username || '',
                        token.full_name || '',
                        token.password || '',
                        token.token || '',
                        token.android_id_yeni || '',
                        token.user_agent || '',
                        token.device_id || '',
                        token.is_active ? 1 : 0,
                        token.added_at || '',
                        token.logout_reason || '',
                        token.logout_time || ''
                    );
                });

                stmt.finalize((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            });
        });
    });
}

function loadExemptions() {
    return new Promise((resolve, reject) => {
        db.all("SELECT post_link, username FROM exemptions", (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            const result = {};
            rows.forEach(row => {
                if (!result[row.post_link]) {
                    result[row.post_link] = [];
                }
                result[row.post_link].push(row.username);
            });

            resolve(result);
        });
    });
}

function saveExemptions(exemptions) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("DELETE FROM exemptions", (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                const stmt = db.prepare("INSERT OR IGNORE INTO exemptions (post_link, username) VALUES (?, ?)");

                Object.entries(exemptions).forEach(([postLink, usernames]) => {
                    if (Array.isArray(usernames)) {
                        usernames.forEach(username => {
                            stmt.run(postLink, username);
                        });
                    }
                });

                stmt.finalize((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            });
        });
    });
}

function loadTokenData() {
    return new Promise((resolve, reject) => {
        db.get("SELECT value FROM key_value WHERE key='legacy_token_data'", (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            if (!row) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(row.value));
            } catch (error) {
                resolve({});
            }
        });
    });
}

function saveTokenData(data) {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT OR REPLACE INTO key_value (key, value) VALUES (?, ?)",
            ['legacy_token_data', JSON.stringify(data)],
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            }
        );
    });
}

module.exports = {
    initStorage,
    loadTokens,
    saveTokens,
    loadExemptions,
    saveExemptions,
    loadTokenData,
    saveTokenData
};