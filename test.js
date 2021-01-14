'use strict';

const puppeteer = require('puppeteer');
const request_client = require('request-promise-native');
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const result = [];

  await page.setRequestInterception(true);

  page.on('request', request => {
    request_client({
      uri: request.url(),
      resolveWithFullResponse: true,
    }).then(response => {
      const status = response.statusCode;
      const request_url = request.url();
      const request_headers = request.headers();
      const request_post_data = request.postData();
      const response_headers = response.headers;
      const response_size = response_headers['content-length'];
      const response_body = response.body;

      result.push({
        request_url,
        status
      });

      console.log(result);
      request.continue();
    }).catch(error => {
      console.error(error);
      request.abort();
    });
  });

  await page.goto('https://google.com/', {
    waitUntil: 'networkidle0',
  });

  await browser.close();
})();