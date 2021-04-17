const puppeteer = require('puppeteer');
var fs = require('fs');

(async () => {
    // var browser = await puppeteer.launch({headless:false})

var browser = await openBrowser(puppeteer);


    var page = await browser.newPage()
    await page.goto('https://www.google.com/')
    var title = await page.title()
    console.log(title)
    await page.close();

    var page = await browser.newPage()
    await page.goto('https://www.booking.com/')
    var title = await page.title()
    console.log(title)
    await page.close();

    var page = await browser.newPage()
    await page.goto('https://www.hln.be/')

    const html = await page.content();

    var fileName = `${Date.now()}.html`;
  //  var htmlPath = path.join(__dirname, 'html', fileName);
    fs.writeFileSync(fileName, html);

    var title = await page.title()
    console.log(title)
    await page.close();

    //await browser.close()
})()


async function openBrowser(puppeteer) {
    var browser = null;
    try {
        var browser = await puppeteer.connect({ "browserWSEndpoint": "http://127.0.0.1:9222" });
        console.log("Connected to existing instance");
    } catch (ex) {

        console.log("Could not connect to existing browser instance, starting new instance...");
        browser = await puppeteer.launch({
            headless: false,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: ['--start-maximized', "--remote-debugging-port=9222"]
        });

    }

    return browser;
}
