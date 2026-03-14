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
    
    // Initialize pool immediately before session middleware
    storage.createPool().catch(err => {
        console.error('PostgreSQL pool creation failed:', err);
    });
} else {
    storage = require('./storage');
}

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration - use PostgreSQL for serverless environments
if (usePostgres) {
    app.use(session({
        store: new pgSession({
            pool: storage.pool,
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

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

storage.initStorage().then(() => {
    console.log('Veritabani baslatildi');
}).catch(err => {
    console.error('Veritabani baslatma hatasi:', err);
});

routes(app);

app.listen(PORT, () => {
    console.log(`Sunucu adresi: http://localhost:${PORT}`);
});
