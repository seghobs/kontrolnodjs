const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const config = require('./config');
const storage = require('./storage');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
    secret: config.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

storage.initStorage().then(() => {
    console.log('Veritabani baslatildi');
}).catch(err => {
    console.error('Veritabani baslatma hatasi:', err);
});

routes(app);

app.listen(PORT, HOST, () => {
    console.log(`Sunucu adresi: http://${HOST}:${PORT}`);
});