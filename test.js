'use strict';

//const puppeteer = require('puppeteer');
const request_client = require('request-promise-native');
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');

(async () => {
  puppeteer.use(pluginStealth());
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  //await page.setRequestInterception(true);
  // page.on('request', interceptedRequest => {
  //   console.log("geting " + interceptedRequest.url());
  //   if (interceptedRequest.url().endsWith('.png') || interceptedRequest.url().endsWith('.jpg'))
  //     interceptedRequest.abort();
  //   else
  //     interceptedRequest.continue();
  // });


  page.on('response', (response) => {
    if(parseInt(response.status()) >= 400)
    {
      console.log(response.request().url());
      console.log(response.status());
    }
  })

  await page.goto('https://wwws.airfrance.fr/ddddddddddddddddddd');
  const title = await page.title();
  console.log(title);
  await browser.close();


})();