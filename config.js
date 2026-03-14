const path = require('path');

const BASE_DIR = __dirname;
const DB_FILE = path.join(BASE_DIR, 'app.db');

// Legacy JSON paths (only for one-time migration)
const TOKEN_FILE = path.join(BASE_DIR, 'token.json');
const TOKENS_FILE = path.join(BASE_DIR, 'tokens.json');
const EXEMPTIONS_FILE = path.join(BASE_DIR, 'exemptions.json');

// PostgreSQL connection string (for Vercel/Fly.io)
const DATABASE_URL = process.env.DATABASE_URL || '';

// Use environment variables if available, otherwise fallback to defaults
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'seho';
const SECRET_KEY = process.env.SECRET_KEY || 'seho_admin_panel_secret_key_2024';

module.exports = {
    BASE_DIR,
    DB_FILE,
    TOKEN_FILE,
    TOKENS_FILE,
    EXEMPTIONS_FILE,
    DATABASE_URL,
    ADMIN_PASSWORD,
    SECRET_KEY,
    IG_APP_ID: '567067343352427'
};
