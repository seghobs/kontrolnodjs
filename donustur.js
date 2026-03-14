function donustur(linkGir) {
    function shortcodeToNumericMediaId(shortcode) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
        const base = alphabet.length;
        let numericId = 0;

        for (const char of shortcode) {
            numericId = numericId * base + alphabet.indexOf(char);
        }

        return numericId;
    }

    const link = linkGir;
    const match = link.match(/https:\/\/www\.instagram\.com\/(?:p|reel)\/([^/]+)\/?/);

    if (match) {
        const shortcode = match[1];
        const numericMediaId = shortcodeToNumericMediaId(shortcode);
        console.log(`Link: ${link}`);
        console.log(`Shortcode: ${shortcode}`);
        console.log(`Numeric Media ID: ${numericMediaId}`);
        return numericMediaId;
    }

    console.log('Invalid Instagram link.');
    return null;
}

module.exports = { donustur };