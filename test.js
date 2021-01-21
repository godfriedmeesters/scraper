const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
                headless: false,
                executablePath: "/usr/bin/google-chrome-stable",
                args: ['--no-xshm',
                '--disable-dev-shm-usage',
                '--single-process',
                '--window-size=1920,1080', '--start-maximized']
            });
  const page = await browser.newPage();
  await page.goto('https://google.com');
  const title  = await page.title();

  await browser.close();
})();