'use strict';

const puppeteer = require('puppeteer');
const request_client = require('request-promise-native');
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const result = [];


  await page.goto('https://google.com/', {
    waitUntil: 'networkidle0',
  });

  await browser.close();
})();