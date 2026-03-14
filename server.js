const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

const config = require('./config');
const routes = require('./routes');

// Use PostgreSQL storage if DATABASE_URL is available (Vercel/Fly.io), otherwise SQLite
let storage;
let usePostgres = false;

if (process.env.DATABASE_URL) {
    storage = require('./storage-postgres');
    usePostgres = true;
} else {
    storage = require('./storage');
}

// Create Express app
const app = express();

// Non-DB middleware (can be added immediately)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Readiness flag for Vercel serverless
app.ready = false;

// Readiness middleware - block requests until DB is ready
app.use((req, res, next) => {
    if (!app.ready) {
        return res.status(503).json({ error: 'Service initializing, please try again in a moment' });
    }
    next();
});

// Async initialization function
async function initialize() {
    try {
        // Initialize storage (and create pool for PostgreSQL)
        await storage.initStorage();
        console.log('Veritabani baslatildi');

        // Session configuration - use PostgreSQL for serverless environments
        if (usePostgres) {
            app.use(session({
                store: new pgSession({
                    pool: storage.getPool(),
                    tableName: 'session',
                    pruneSessionInterval: 60 * 60 // Prune expired sessions every hour
                }),
                secret: config.SECRET_KEY,
                resave: false,
                saveUninitialized: false,
                cookie: { 
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 24 * 60 * 60 * 1000,
                    sameSite: 'lax'
                }
            }));
        } else {
            app.use(session({
                secret: config.SECRET_KEY,
                resave: false,
                saveUninitialized: false,
                cookie: { 
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 24 * 60 * 60 * 1000 // 24 hours
                }
            }));
        }

        // Add routes after session middleware
        routes(app);

        // Mark app as ready
        app.ready = true;
        console.log('Sunucu hazir');
    } catch (error) {
        console.error('Sunucu baslatma hatasi:', error);
        process.exit(1);
    }
}

// Start initialization
initialize();

// Export for Vercel serverless
module.exports = app;

// For local development - start HTTP server
if (require.main === module) {
    initialize().then(() => {
        const PORT = process.env.PORT || 5000;
        const HOST = process.env.HOST || '0.0.0.0';
        app.listen(PORT, HOST, () => {
            console.log(`Sunucu adresi: http://${HOST}:${PORT}`);
        });
    }).catch(err => {
        console.error('Sunucu baslatma hatasi:', err);
        process.exit(1);
    });
}
