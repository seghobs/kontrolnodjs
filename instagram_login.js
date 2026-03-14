const axios = require('axios');
const config = require('./config');
const storage = require('./storage');

async function girisYap(username, password, androidId, userAgent, deviceId) {
    const androidIdYeni = androidId.trim();
    const selectedUserAgent = userAgent.trim();
    const selectedDeviceId = deviceId.trim();
    const currentTimestamp = Date.now() / 1000;

    console.log('Manuel girilen user agent:', selectedUserAgent);
    console.log('Manuel girilen device id:', selectedDeviceId);

    const navChain = (
        `SelfFragment:self_profile:2:main_profile:${currentTimestamp.toFixed(3)}::,`
        `ProfileMediaTabFragment:self_profile:3:button:${(currentTimestamp + 0.287).toFixed(3)}::,`
        `SettingsScreenFragment:ig_settings:4:button:${(currentTimestamp + 2.284).toFixed(3)}::,`
        `com.bloks.www.caa.login.aymh_single_profile_screen_entry:`
        `com.bloks.www.caa.login.aymh_single_profile_screen_entry:6:button:${(currentTimestamp + 0.308).toFixed(3)}::`
    );

    const headers = {
        'x-ig-app-locale': 'tr_TR',
        'x-ig-device-locale': 'tr_TR',
        'x-ig-mapped-locale': 'tr_TR',
        'x-bloks-version-id': 'af73ae8cc48182fdcaf2eb0beac7935cb25fd05d18118022cd3f433a4b04e459',
        'x-bloks-is-prism-enabled': 'true',
        'x-bloks-prism-button-version': 'PROPOSAL_A',
        'x-bloks-prism-colors-enabled': 'false',
        'x-bloks-prism-font-enabled': 'false',
        'x-ig-attest-params': JSON.stringify({
            attestation: [{
                version: 2,
                type: 'keystore',
                errors: [],
                challenge_nonce: '',
                signed_nonce: '',
                key_hash: ''
            }]
        }),
        'x-bloks-is-layout-rtl': 'false',
        'x-ig-device-id': selectedDeviceId,
        'x-ig-android-id': `android-${androidIdYeni}`,
        'x-ig-timezone-offset': '10800',
        'x-ig-nav-chain': navChain,
        'x-fb-connection-type': 'WIFI',
        'x-ig-connection-type': 'WIFI',
        'x-ig-capabilities': '3brTv10=',
        'x-ig-app-id': config.IG_APP_ID,
        priority: 'u=3',
        'user-agent': selectedUserAgent,
        'accept-language': 'tr-TR, en-US',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-fb-http-engine': 'Liger',
        'x-fb-client-ip': 'True',
        'x-fb-server-cluster': 'True'
    };

    const data = {
        params: (
            `{"client_input_params":{`
            `"should_show_nested_nta_from_aymh":1,`
            `"device_id":"android-${androidIdYeni}",`
            `"login_attempt_count":1,`
            `"secure_family_device_id":"",`
            `"machine_id":"${androidIdYeni}",`
            `"accounts_list":[{`
            `"uid":"",`
            `"credential_type":"none",`
            `"token":""},`
            `{"credential_type":"google_oauth",`
            `"account_type":"google_oauth",`
            `"token":""}],`
            `"auth_secure_device_id":"",`
            `"has_whatsapp_installed":1,`
            `"password":"#PWD_INSTAGRAM:0:0:${password}",`
            `"sso_token_map_json_string":"{\\"62428590454\\":[]}",`
            `"family_device_id":"${selectedDeviceId}",`
            `"fb_ig_device_id":[],`
            `"device_emails":[""],`
            `"try_num":1,`
            `"lois_settings":{"lois_token":"","lara_override":""},`
            `"event_flow":"login_manual",`
            `"event_step":"home_page",`
            `"headers_infra_flow_id":"",`
            `"openid_tokens":{"":""},`
            `"client_known_key_hash":"",`
            `"contact_point":"${username}",`
            `"encrypted_msisdn":""},`
            `"server_params":{`
            `"should_trigger_override_login_2fa_action":0,`
            `"is_from_logged_out":1,`
            `"should_trigger_override_login_success_action":0,`
            `"login_credential_type":"none",`
            `"server_login_source":"login",`
            `"waterfall_id":"${selectedDeviceId}",`
            `"login_source":"Login",`
            `"is_platform_login":0,`
            `"INTERNAL__latency_qpl_marker_id":36707139,`
            `"offline_experiment_group":"caa_iteration_v3_perf_ig_4",`
            `"is_from_landing_page":0,`
            `"password_text_input_id":"9xrg1k:86",`
            `"is_from_empty_password":0,`
            `"ar_event_source":"login_home_page",`
            `"qe_device_id":"${selectedDeviceId}",`
            `"username_text_input_id":"9xrg1k:85",`
            `"layered_homepage_experiment_group":null,`
            `"device_id":"android-${androidIdYeni}",`
            `"INTERNAL__latency_qpl_instance_id":6.0090341600153E13,`
            `"reg_flow_source":"aymh_single_profile_native_integration_point",`
            `"is_caa_perf_enabled":1,`
            `"credential_type":"password",`
            `"caller":"gslr",`
            `"family_device_id":null,`
            `"INTERNAL_INFRA_THEME":"harm_f",`
            `"access_flow_version":"F2_FLOW",`
            `"is_from_logged_in_switcher":0}}`
        ),
        bk_client_context: (
            `{"bloks_version":"af73ae8cc48182fdcaf2eb0beac7935cb25fd05d18118022cd3f433a4b04e459",`
            `"styles_id":"instagram"}`
        ),
        bloks_versioning_id: 'af73ae8cc48182fdcaf2eb0beac7935cb25fd05d18118022cd3f433a4b04e459'
    };

    try {
        const response = await axios.post(
            'https://i.instagram.com/api/v1/bloks/apps/com.bloks.www.bloks.caa.login.async.send_login_request/',
            data,
            { headers, timeout: 10000 }
        );

        console.log('Response Status Code:', response.status);

        const bearerToken = findBearerToken(response.data);

        console.log('\n=== BULUNAN BEARER TOKEN ===');
        console.log('Token:', bearerToken);
        console.log('Android ID:', androidIdYeni);
        console.log('User Agent:', selectedUserAgent);
        console.log('Device ID:', selectedDeviceId);
        console.log('='.repeat(50));

        if (!bearerToken) {
            console.log('\n[HATA] Token bulunamadı! Response\'da token yok olabilir.');
        }

        await storage.saveTokenData({
            token: bearerToken,
            android_id_yeni: androidIdYeni,
            user_agent: selectedUserAgent,
            device_id: selectedDeviceId
        });

        return [bearerToken, androidIdYeni, selectedUserAgent, selectedDeviceId];
    } catch (error) {
        console.error('Giris yapma hatasi:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        return [null, androidIdYeni, selectedUserAgent, selectedDeviceId];
    }
}

function findBearerToken(payload) {
    const tokenPattern = /Bearer IGT:[a-zA-Z0-9:_\-]+/;

    function search(obj) {
        if (typeof obj === 'string') {
            const match = obj.match(tokenPattern);
            if (match) {
                return match[0];
            }
        } else if (typeof obj === 'object' && obj !== null) {
            for (const value of Object.values(obj)) {
                const result = search(value);
                if (result) {
                    return result;
                }
            }
        } else if (Array.isArray(obj)) {
            for (const item of obj) {
                const result = search(item);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }

    return search(payload);
}

module.exports = { girisYap };