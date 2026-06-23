const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Apply stealth plugin
puppeteer.use(StealthPlugin());

let browserInstance = null;

async function launchBrowser(headless = true, profilePath = null) {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
    }
    
    const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certifcate-errors',
        '--ignore-certifcate-errors-spki-list'
    ];
    
    console.log(`[Puppeteer] Launching browser (headless: ${headless}, profile: ${profilePath})`);
    
    browserInstance = await puppeteer.launch({
        headless: headless,
        userDataDir: profilePath,
        args: args,
        defaultViewport: null
    });
    
    return browserInstance;
}

async function getBrowser() {
    return browserInstance;
}

async function closeBrowser() {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
        console.log(`[Puppeteer] Browser closed`);
    }
}

module.exports = {
    launchBrowser,
    getBrowser,
    closeBrowser
};
