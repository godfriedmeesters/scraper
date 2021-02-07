const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');

const fs = require('fs');

(async () => {
  const width = 1920 + Math.floor(Math.random() * 100);
  const height = 1080 + Math.floor(Math.random() * 100);

  const options = [];
  //puppeteer.use(pluginStealth());
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [`--window-size=${width},${height}`, ...options]
  });

  const page = await browser.newPage();
});

