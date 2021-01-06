const wdio = require('webdriverio');

const appiumOpts = {
    hostname: process.env.APPIUM_HOST,
    path: '/wd/hub',
    port: 4723,
    capabilities: {
        "platformName": "Android",
        "buildToolsVersion": "28.0.3",
        "deviceName": "emulator-5554",
        //"app": "C:\\projects\\scraper\\services\\scraper\\expedia\\Expedia_v20.49.0_apkpure.com.apk",
        "app": apkPath,
        "autoGrantPermissions": "true",
        "language": "de",
        "locale": "DE",
    },
    logLevel: "warn"
};


async () => {
    this.appiumClient = await wdio.remote(appiumOpts);
};