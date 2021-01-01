const puppeteer = require('puppeteer');
var path = require('path');
const { join } = require('path');
const fs = require('fs').promises;

const profilePath = path.join(__dirname, 'Profile1');

//const profilePath = "./Profile1";

(async () => {
  console.log(profilePath);
  const browser = await puppeteer.launch({
    headless: false, args: [
      // `--user-data-dir=${profilePath}`
      //'--profile-directory=Profile 1'
    ]
  });
  const page = await browser.newPage();
  const cookiesString = await fs.readFile('./www.expedia.fr.cookies.json');
  const cookies = JSON.parse(cookiesString);

  for(var cookie of cookies)
  {
    cookie.expires =-1;
    console.log(cookie.expires);
  }

  await page.setCookie(...cookies);

  for(var cookie in page.cookies())
  {
console.log(cookie);
  }


  await page.goto("http://www.expedia.fr");
  await page.waitFor(5000)
  //await browser.close();
})();