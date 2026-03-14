const storage = require('./storage');
const instagramApi = require('./instagram_api');
const instagramLogin = require('./instagram_login');

async function deactivateToken(tokens, username, reason) {
    for (const token of tokens) {
        if (token.username === username) {
            token.is_active = false;
            token.logout_reason = reason;
            token.logout_time = new Date().toISOString();
            return true;
        }
    }
    return false;
}

function clearLogoutState(token) {
    delete token.logout_reason;
    delete token.logout_time;
}

async function getWorkingActiveToken(excludedUsernames = new Set()) {
    const tokens = await storage.loadTokens();
    let changed = false;

    for (const tokenRecord of tokens) {
        if (!tokenRecord.is_active) {
            continue;
        }

        const username = tokenRecord.username;
        if (excludedUsernames.has(username)) {
            continue;
        }

        const androidId = (tokenRecord.android_id_yeni || '').trim();
        const userAgent = (tokenRecord.user_agent || '').trim();
        const deviceId = (tokenRecord.device_id || '').trim();
        const tokenValue = (tokenRecord.token || '').trim();

        if (!androidId || !userAgent || !deviceId || !tokenValue) {
            await deactivateToken(
                tokens,
                username,
                'Bu hesapta zorunlu bilgiler eksik (token/android_id/user_agent/device_id)'
            );
            changed = true;
            continue;
        }

        const isValid = await instagramApi.validateToken(tokenRecord);
        if (isValid) {
            if (changed) {
                await storage.saveTokens(tokens);
            }
            return tokenRecord;
        }

        await deactivateToken(
            tokens,
            username,
            'Bu hesabin oturumu Instagram\'dan cikis yapildi'
        );
        changed = true;
    }

    if (changed) {
        await storage.saveTokens(tokens);
    }
    return null;
}

async function fetchCommentsWithFailover(mediaId) {
    const maxRetries = 10;
    let retryCount = 0;
    const triedUsernames = new Set();
    const usernames = new Set();

    while (retryCount < maxRetries) {
        const tokenRecord = await getWorkingActiveToken(triedUsernames);
        if (!tokenRecord || !tokenRecord.token) {
            return usernames;
        }

        const currentUsername = tokenRecord.username || 'bilinmeyen';
        console.log(`Token kullaniliyor: @${currentUsername}`);

        try {
            const result = await instagramApi.fetchCommentUsernames(mediaId, tokenRecord);
            for (const username of result.usernames) {
                usernames.add(username);
            }

            if (result.ok) {
                console.log(`Basari! Toplam ${usernames.size} kullanici bulundu.`);
                return usernames;
            }
        } catch (error) {
            console.error('Yorum cekme hatasi:', error);
        }

        const tokens = await storage.loadTokens();
        await deactivateToken(tokens, currentUsername, 'Bu hesabin oturumu Instagram\'dan cikis yapildi');
        await storage.saveTokens(tokens);

        retryCount++;
        triedUsernames.add(currentUsername);
    }

    return usernames;
}

async function resolveCurrentUser(token, userAgent, androidId, deviceId) {
    const response = await instagramApi.fetchCurrentUser(token, userAgent, androidId, deviceId, 5);
    if (response.status !== 200) {
        return null;
    }
    return response.data?.user || null;
}

async function upsertLoginToken(username, password, token, androidId, userAgent, deviceId) {
    const tokens = await storage.loadTokens();
    const existing = tokens.find(item => item.username === username);

    if (existing) {
        existing.password = password;
        existing.token = token;
        existing.android_id_yeni = androidId;
        existing.user_agent = userAgent;
        existing.device_id = deviceId;
        existing.is_active = true;
        clearLogoutState(existing);
    } else {
        const userData = await resolveCurrentUser(token, userAgent, androidId, deviceId) || {};
        tokens.push({
            username,
            full_name: userData.full_name || '',
            password,
            token,
            android_id_yeni: androidId,
            user_agent: userAgent,
            device_id: deviceId,
            is_active: true,
            added_at: new Date().toISOString()
        });
    }

    await storage.saveTokens(tokens);
}

async function reloginSavedUser(username) {
    const tokens = await storage.loadTokens();
    const target = tokens.find(item => item.username === username);
    if (!target) {
        return { ok: false, code: 404, message: 'Token bulunamadi' };
    }

    const required = [
        (target.password || '').trim(),
        (target.android_id_yeni || '').trim(),
        (target.user_agent || '').trim(),
        (target.device_id || '').trim()
    ];

    if (!required.every(Boolean)) {
        return { ok: false, code: 400, message: 'Bu hesap icin zorunlu bilgiler eksik' };
    }

    const [newToken, newAndroidId, newUserAgent, newDeviceId] = 
        await instagramLogin.girisYap(
            username,
            target.password,
            target.android_id_yeni,
            target.user_agent,
            target.device_id
        );

    if (!newToken) {
        return { ok: false, code: 400, message: 'Giris basarisiz' };
    }

    target.token = newToken;
    target.android_id_yeni = newAndroidId;
    target.user_agent = newUserAgent;
    target.device_id = newDeviceId;
    target.is_active = true;
    clearLogoutState(target);
    await storage.saveTokens(tokens);

    return { ok: true, message: `@${username} icin token basariyla yenilendi` };
}

module.exports = {
    deactivateToken,
    clearLogoutState,
    getWorkingActiveToken,
    fetchCommentsWithFailover,
    resolveCurrentUser,
    upsertLoginToken,
    reloginSavedUser
};