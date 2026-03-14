const express = require('express');
const router = express.Router();
const tokenService = require('../token_service');
const storage = require('../storage');

function requireAdmin(req, res, next) {
    if (!req.session?.adminLoggedIn) {
        return res.status(401).json({ success: false, message: 'Yetkisiz erisim' });
    }
    next();
}

router.get('/', async (req, res) => {
    if (!req.session?.adminLoggedIn) {
        return res.redirect('/admin/login');
    }
    res.render('admin');
});

router.get('/login', (req, res) => {
    if (req.session?.adminLoggedIn) {
        return res.redirect('/admin');
    }
    res.render('admin_login', { error: false });
});

router.post('/login', async (req, res) => {
    const password = req.body.password || '';
    
    if (password === require('../config').ADMIN_PASSWORD) {
        req.session.adminLoggedIn = true;
        return res.redirect('/admin');
    }
    
    res.render('admin_login', { error: true });
});

router.get('/logout', (req, res) => {
    req.session.adminLoggedIn = false;
    return res.redirect('/admin/login');
});

router.get('/get_tokens', requireAdmin, async (req, res) => {
    try {
        const tokens = await storage.loadTokens();
        return res.json({ success: true, tokens });
    } catch (error) {
        console.error('Get tokens error:', error);
        return res.status(500).json({ success: false, message: 'Tokenler yuklenemedi' });
    }
});

router.post('/add_token', requireAdmin, async (req, res) => {
    try {
        const { token, android_id, device_id, user_agent, password, is_active = true, added_at } = req.body;

        if (!token || !android_id || !device_id || !user_agent || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tum alanlar zorunlu' 
            });
        }

        const response = await require('../instagram_api').fetchCurrentUser(
            token,
            user_agent,
            android_id,
            device_id,
            5
        );

        if (response.status !== 200) {
            return res.status(400).json({ success: false, message: 'Token gecersiz' });
        }

        const userData = response.data?.user || {};
        const username = userData.username;
        const fullName = userData.full_name || '';

        if (!username) {
            return res.status(400).json({ success: false, message: 'Kullanici adi alinamadi' });
        }

        const tokens = await storage.loadTokens();
        const existingIndex = tokens.findIndex(t => t.username === username);
        
        const newToken = {
            username,
            full_name: fullName,
            password: password.trim(),
            token: token.trim(),
            android_id_yeni: android_id.trim(),
            user_agent: user_agent.trim(),
            device_id: device_id.trim(),
            is_active: Boolean(is_active),
            added_at: added_at || new Date().toISOString()
        };

        if (existingIndex >= 0) {
            tokens[existingIndex] = newToken;
        } else {
            tokens.push(newToken);
        }

        await storage.saveTokens(tokens);

        return res.json({
            success: true,
            message: `@${username} (${fullName}) icin token ${existingIndex >= 0 ? 'guncellendi' : 'eklendi'}`,
            username,
            full_name: fullName
        });
    } catch (error) {
        console.error('Add token error:', error);
        return res.status(500).json({ 
            success: false, 
            message: `Token eklenemedi: ${error.message}` 
        });
    }
});

router.post('/delete_token', requireAdmin, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kullanici adi belirtilmedi' 
            });
        }

        const tokens = (await storage.loadTokens()).filter(item => item.username !== username);
        await storage.saveTokens(tokens);

        return res.json({ 
            success: true, 
            message: `${username} icin token silindi` 
        });
    } catch (error) {
        console.error('Delete token error:', error);
        return res.status(500).json({ success: false, message: 'Token silinemedi' });
    }
});

router.post('/toggle_token', requireAdmin, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kullanici adi belirtilmedi' 
            });
        }

        const tokens = await storage.loadTokens();
        const token = tokens.find(t => t.username === username);

        if (!token) {
            return res.status(404).json({ success: false, message: 'Token bulunamadi' });
        }

        token.is_active = !token.is_active;
        
        if (token.is_active) {
            tokenService.clearLogoutState(token);
        }

        await storage.saveTokens(tokens);

        const status = token.is_active ? 'aktif' : 'pasif';
        return res.json({ 
            success: true, 
            message: `${username} icin token ${status} yapildi`,
            is_active: token.is_active
        });
    } catch (error) {
        console.error('Toggle token error:', error);
        return res.status(500).json({ success: false, message: 'Token durumu degistirilemedi' });
    }
});

router.post('/update_token', requireAdmin, async (req, res) => {
    try {
        const { username, token, android_id, device_id, user_agent, password } = req.body;

        if (!username || !token || !android_id || !device_id || !user_agent || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tum alanlar zorunlu' 
            });
        }

        const validateResponse = await require('../instagram_api').fetchCurrentUser(
            token,
            user_agent,
            android_id,
            device_id,
            5
        );

        if (validateResponse.status !== 200) {
            return res.status(400).json({ success: false, message: 'Yeni token gecersiz' });
        }

        const tokens = await storage.loadTokens();
        const targetToken = tokens.find(t => t.username === username);

        if (!targetToken) {
            return res.status(404).json({ success: false, message: 'Token bulunamadi' });
        }

        targetToken.token = token.trim();
        targetToken.android_id_yeni = android_id.trim();
        targetToken.device_id = device_id.trim();
        targetToken.user_agent = user_agent.trim();
        targetToken.password = password.trim();
        targetToken.is_active = true;
        tokenService.clearLogoutState(targetToken);

        await storage.saveTokens(tokens);

        return res.json({ 
            success: true, 
            message: `@${username} icin token basariyla guncellendi` 
        });
    } catch (error) {
        console.error('Update token error:', error);
        return res.status(500).json({ 
            success: false, 
            message: `Token guncellenemedi: ${error.message}` 
        });
    }
});

router.post('/relogin_token', requireAdmin, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kullanici adi belirtilmedi' 
            });
        }

        const result = await tokenService.reloginSavedUser(username);
        
        if (!result.ok) {
            return res.status(result.code || 400).json({ 
                success: false, 
                message: result.message 
            });
        }

        return res.json({ 
            success: true, 
            message: result.message 
        });
    } catch (error) {
        console.error('Relogin token error:', error);
        return res.status(500).json({ success: false, message: 'Token yenilenemedi' });
    }
});

router.post('/validate_token', requireAdmin, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({ 
                success: false, 
                message: 'Kullanici adi belirtilmedi' 
            });
        }

        const tokens = await storage.loadTokens();
        const token = tokens.find(t => t.username === username);

        if (!token) {
            return res.status(404).json({ success: false, message: 'Token bulunamadi' });
        }

        const isValid = await require('../instagram_api').validateToken(token);
        
        if (!isValid && token.is_active) {
            token.is_active = false;
            token.logout_reason = 'Bu hesabin oturumu Instagram\'dan cikis yapildi';
            token.logout_time = new Date().toISOString();
            await storage.saveTokens(tokens);
        }

        return res.json({ 
            success: true, 
            is_valid: isValid,
            is_active: token.is_active
        });
    } catch (error) {
        console.error('Validate token error:', error);
        return res.status(500).json({ success: false, message: 'Token dogrulanamadi' });
    }
});

module.exports = router;