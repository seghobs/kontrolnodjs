const axios = require('axios');
const config = require('./config');

function buildAuthHeaders(token, userAgent, androidId, deviceId) {
    return {
        authorization: token,
        'user-agent': userAgent,
        'x-ig-app-id': config.IG_APP_ID,
        'x-ig-android-id': `android-${androidId}`,
        'x-ig-device-id': deviceId
    };
}

async function fetchCurrentUser(token, userAgent, androidId, deviceId, timeout = 5) {
    const headers = buildAuthHeaders(token, userAgent, androidId, deviceId);
    
    try {
        const response = await axios.get(
            'https://i.instagram.com/api/v1/accounts/current_user/?edit=true',
            {
                headers,
                timeout: timeout * 1000,
                validateStatus: function (status) {
                    return status < 500; 
                }
            }
        );
        return response;
    } catch (error) {
        if (error.response) {
            return error.response;
        }
        throw error;
    }
}

async function validateToken(tokenRecord) {
    try {
        const response = await fetchCurrentUser(
            tokenRecord.token || '',
            tokenRecord.user_agent || '',
            tokenRecord.android_id_yeni || '',
            tokenRecord.device_id || '',
            3
        );
        return response.status === 200;
    } catch (error) {
        console.error('Token validation error:', error.message);
        return false;
    }
}

async function fetchCommentUsernames(mediaId, tokenRecord, minId = null) {
    const token = tokenRecord.token || '';
    const userAgent = tokenRecord.user_agent || '';
    const androidId = tokenRecord.android_id_yeni || '';
    const deviceId = tokenRecord.device_id || '';

    const headers = {
        authorization: token,
        'user-agent': userAgent,
        'x-ig-app-locale': 'tr_TR',
        'x-ig-device-locale': 'tr_TR',
        'x-ig-mapped-locale': 'tr_TR',
        'x-ig-android-id': `android-${androidId}`,
        'x-ig-device-id': deviceId,
        'x-ig-app-id': config.IG_APP_ID,
        'x-ig-capabilities': '3brTv10=',
        'x-ig-connection-type': 'WIFI',
        'x-fb-connection-type': 'WIFI',
        'accept-language': 'tr-TR, en-US',
        'x-fb-http-engine': 'Liger',
        'x-fb-client-ip': 'True',
        'x-fb-server-cluster': 'True'
    };

    const params = {
        min_id: minId,
        sort_order: 'popular',
        analytics_module: 'comments_v2_feed_contextual_profile',
        can_support_threading: 'true',
        is_carousel_bumped_post: 'false',
        feed_position: '0'
    };

    const usernames = new Set();

    try {
        const response = await axios.get(
            `https://i.instagram.com/api/v1/media/${mediaId}/stream_comments/`,
            {
                headers,
                params,
                timeout: 10000,
                validateStatus: function (status) {
                    return status < 500;
                }
            }
        );

        if (response.status === 401 || response.status === 403) {
            return { ok: false, status: response.status, usernames: usernames };
        }

        if (response.status !== 200) {
            return { ok: false, status: response.status, usernames: usernames };
        }

        const jsonData = parseStreamComments(response.data);
        
        if (jsonData) {
            for (const comment of jsonData.comments || []) {
                const username = comment.user?.username;
                if (username) {
                    usernames.add(username);
                }
            }

            const nextMinId = jsonData.next_min_id;
            if (nextMinId) {
                const nextResult = await fetchCommentUsernames(mediaId, tokenRecord, nextMinId);
                for (const username of nextResult.usernames) {
                    usernames.add(username);
                }
                return { ok: nextResult.ok, status: response.status, usernames: usernames };
            }
        }

        return { ok: true, status: 200, usernames: usernames };
    } catch (error) {
        console.error('Fetch comments error:', error.message);
        return { ok: false, status: 500, usernames: usernames };
    }
}

function parseStreamComments(data) {
    if (typeof data === 'string') {
        for (const line of data.split('\n')) {
            try {
                return JSON.parse(line);
            } catch (e) {
                continue;
            }
        }
        return null;
    }
    return data;
}

module.exports = {
    buildAuthHeaders,
    fetchCurrentUser,
    validateToken,
    fetchCommentUsernames
};