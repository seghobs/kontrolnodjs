const { Pool } = require('pg');
const config = require('./config');

let pool = null;

function connect() {
    const connectionString = process.env.DATABASE_URL || config.DATABASE_URL;
    
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
    }

    pool = new Pool({
        connectionString: connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    return pool.connect();
}

async function initStorage() {
    try {
        const client = await connect();
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS tokens (
                username TEXT PRIMARY KEY,
                full_name TEXT DEFAULT '',
                password TEXT DEFAULT '',
                token TEXT DEFAULT '',
                android_id_yeni TEXT DEFAULT '',
                user_agent TEXT DEFAULT '',
                device_id TEXT DEFAULT '',
                is_active BOOLEAN DEFAULT true,
                added_at TEXT DEFAULT '',
                logout_reason TEXT DEFAULT '',
                logout_time TEXT DEFAULT ''
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS exemptions (
                post_link TEXT NOT NULL,
                username TEXT NOT NULL,
                PRIMARY KEY (post_link, username)
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS key_value (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);

        // Create index for faster queries
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_tokens_username ON tokens(username)
        `);

        client.release();
        console.log('PostgreSQL veritabani baslatildi');
    } catch (error) {
        console.error('PostgreSQL veritabani baslatma hatasi:', error);
        throw error;
    }
}

function loadTokens() {
    return new Promise((resolve, reject) => {
        pool.query('SELECT * FROM tokens ORDER BY username ASC', (err, rows) => {
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
        pool.query('DELETE FROM tokens', (err) => {
            if (err) {
                reject(err);
                return;
            }

            const client = pool;
            tokens.forEach(async (token) => {
                await client.query(
                    `INSERT INTO tokens (
                        username, full_name, password, token, android_id_yeni,
                        user_agent, device_id, is_active, added_at, logout_reason, logout_time
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                        token.username || '',
                        token.full_name || '',
                        token.password || '',
                        token.token || '',
                        token.android_id_yeni || '',
                        token.user_agent || '',
                        token.device_id || '',
                        token.is_active || true,
                        token.added_at || '',
                        token.logout_reason || '',
                        token.logout_time || ''
                    ]
                );
            }).then(() => resolve(true)).catch(reject);
        });
    });
}

function loadExemptions() {
    return new Promise((resolve, reject) => {
        pool.query('SELECT post_link, username FROM exemptions', (err, rows) => {
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
        pool.query('DELETE FROM exemptions', (err) => {
            if (err) {
                reject(err);
                return;
            }

            const client = pool;
            Object.entries(exemptions).forEach(async ([postLink, usernames]) => {
                if (Array.isArray(usernames)) {
                    usernames.forEach(async (username) => {
                        await client.query(
                            'INSERT INTO exemptions (post_link, username) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                            [postLink, username]
                        );
                    });
                }
            }).then(() => resolve(true)).catch(reject);
        });
    });
}

function loadTokenData() {
    return new Promise((resolve, reject) => {
        pool.query("SELECT value FROM key_value WHERE key='legacy_token_data'", (err, rows) => {
            if (err) {
                reject(err);
                return;
            }

            if (rows.length === 0) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(rows[0].value));
            } catch (error) {
                resolve({});
            }
        });
    });
}

function saveTokenData(data) {
    return new Promise((resolve, reject) => {
        pool.query(
            'INSERT INTO key_value (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
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
    saveTokenData,
    pool
};