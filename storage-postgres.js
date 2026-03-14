const { Pool } = require('pg');
const config = require('./config');

let pool = null;

async function createPool() {
    const connectionString = process.env.DATABASE_URL || config.DATABASE_URL;
    
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
    }

    pool = new Pool({
        connectionString: connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Wait for pool to be ready
    await new Promise((resolve, reject) => {
        pool.on('error', reject);
        pool.on('connect', resolve);
        // Also resolve after timeout to prevent hanging
        setTimeout(resolve, 5000);
    });

    return pool;
}

// Getter to always return current pool instance
function getPool() {
    return pool;
}

async function connect() {
    if (!pool) {
        await createPool();
    }
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

async function loadTokens() {
    try {
        const result = await pool.query('SELECT * FROM tokens ORDER BY username ASC');
        const tokens = result.rows.map(row => {
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
        return tokens;
    } catch (error) {
        console.error('loadTokens error:', error);
        throw error;
    }
}

async function saveTokens(tokens) {
    try {
        await pool.query('DELETE FROM tokens');
        const insertPromises = tokens.map(token => 
            pool.query(
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
            )
        );
        await Promise.all(insertPromises);
        return true;
    } catch (error) {
        console.error('saveTokens error:', error);
        throw error;
    }
}

async function loadExemptions() {
    try {
        const result = await pool.query('SELECT post_link, username FROM exemptions');
        const exemptions = {};
        result.rows.forEach(row => {
            if (!exemptions[row.post_link]) {
                exemptions[row.post_link] = [];
            }
            exemptions[row.post_link].push(row.username);
        });
        return exemptions;
    } catch (error) {
        console.error('loadExemptions error:', error);
        throw error;
    }
}

async function saveExemptions(exemptions) {
    try {
        await pool.query('DELETE FROM exemptions');
        const insertPromises = Object.entries(exemptions).flatMap(([postLink, usernames]) => 
            usernames.map(username => 
                pool.query(
                    'INSERT INTO exemptions (post_link, username) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [postLink, username]
                )
            )
        );
        await Promise.all(insertPromises);
        return true;
    } catch (error) {
        console.error('saveExemptions error:', error);
        throw error;
    }
}

async function loadTokenData() {
    try {
        const result = await pool.query("SELECT value FROM key_value WHERE key='legacy_token_data'");
        if (result.rows.length === 0) {
            return {};
        }
        try {
            return JSON.parse(result.rows[0].value);
        } catch (error) {
            return {};
        }
    } catch (error) {
        console.error('loadTokenData error:', error);
        throw error;
    }
}

async function saveTokenData(data) {
    try {
        await pool.query(
            'INSERT INTO key_value (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
            ['legacy_token_data', JSON.stringify(data)]
        );
        return true;
    } catch (error) {
        console.error('saveTokenData error:', error);
        throw error;
    }
}

module.exports = {
    initStorage,
    loadTokens,
    saveTokens,
    loadExemptions,
    saveExemptions,
    loadTokenData,
    saveTokenData,
    getPool,
    createPool
};
