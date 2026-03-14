const express = require('express');
const router = express.Router();
const tokenService = require('../token_service');
const donustur = require('../donustur');

async function getExemptedUsers(postLink) {
    const exemptions = await require('../storage').loadExemptions();
    const postLinkDecoded = decodeURIComponent(postLink);
    return new Set(exemptions[postLinkDecoded] || []);
}

router.get('/', async (req, res) => {
    res.render('form', { token_error_message: '' });
});

router.post('/', async (req, res) => {
    try {
        const activeWorkingToken = await tokenService.getWorkingActiveToken();
        if (!activeWorkingToken) {
            return res.render('form', {
                token_error_message: 'Tum hesaplar cikis yapmis gorunuyor. Lutfen admin panelden gecerli bir token girin.'
            });
        }

        const link = req.body.post_link;
        const mediaId = donustur.donustur(link);
        
        if (!mediaId) {
            return res.render('form', {
                token_error_message: 'Gecersiz Instagram linki. Lutfen gecerli bir post veya reel linki girin.'
            });
        }

        const allUsernames = await tokenService.fetchCommentsWithFailover(mediaId);
        const grupUye = req.body.grup_uye || '';
        const grupUyeKullanicilar = new Set(grupUye.split('\n').map(u => u.trim()).filter(u => u));
        const izinliUyeler = await getExemptedUsers(link);
        const eksikler = new Set([...grupUyeKullanicilar].filter(u => !izinliUyeler.has(u) && !allUsernames.has(u)));

        return res.render('result', {
            eksikler: Array.from(eksikler),
            post_link: link
        });
    } catch (error) {
        console.error('Index route error:', error);
        return res.render('form', {
            token_error_message: 'Bir hata olustu. Lutfen tekrar deneyin.'
        });
    }
});

router.post('/add_exemption', async (req, res) => {
    try {
        const { post_link, username } = req.body;

        if (!post_link || !username) {
            return res.status(400).json({ 
                success: false, 
                message: 'Paylasim linki ve kullanici adi gerekli' 
            });
        }

        const postLinkDecoded = decodeURIComponent(post_link);
        const exemptions = await require('../storage').loadExemptions();
        
        if (!exemptions[postLinkDecoded]) {
            exemptions[postLinkDecoded] = [];
        }

        if (!exemptions[postLinkDecoded].includes(username)) {
            exemptions[postLinkDecoded].push(username);
            await require('../storage').saveExemptions(exemptions);
        }

        return res.json({ 
            success: true, 
            message: `@${username} izinli kullanicilar listesine eklendi` 
        });
    } catch (error) {
        console.error('Add exemption error:', error);
        return res.status(500).json({ 
            success: false, 
            message: `Hata: ${error.message}` 
        });
    }
});

router.get('/token_al', (req, res) => {
    res.render('token');
});

router.post('/giris_yaps', async (req, res) => {
    try {
        const username = (req.body.kullanici_adi || '').trim();
        const password = (req.body.sifre || '').trim();
        const androidId = (req.body.android_id || '').trim();
        const userAgent = (req.body.user_agent || '').trim();
        const deviceId = (req.body.device_id || '').trim();

        if (!username || !password || !androidId || !userAgent || !deviceId) {
            return res.status(400).json({ 
                token: null, 
                message: 'kullanici_adi, sifre, android_id, user_agent ve device_id zorunludur' 
            });
        }

        const [tokenValue, androidIdYeni, userAgentYeni, deviceIdYeni] = 
            await require('../instagram_login').girisYap(
                username, password, androidId, userAgent, deviceId
            );

        if (tokenValue) {
            await tokenService.upsertLoginToken(
                username, password, tokenValue, androidIdYeni, userAgentYeni, deviceIdYeni
            );
        }

        return res.json({
            token: tokenValue,
            android_id_yeni: androidIdYeni,
            user_agent: userAgentYeni,
            device_id: deviceIdYeni
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            token: null, 
            message: `Giris hatasi: ${error.message}` 
        });
    }
});

module.exports = router;