const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();


        await page.setReqestInterception(true);

        page.on('request', async (request) => {
            request.continue();
        });

        page.on('response', async response => {
            if (response.url().includes("https://booking.com")) {
                const address = await response.remoteAddress();

                console.log(`${response.url()}: ${address.ip}`);

            }
        });



        await page.goto('https://booking.com');
        // await page.screenshot({ path: 'example.png' });

        await browser.close();
    } catch (ex) {
        console.log("" + ex.message + "stacktrsac: " + ex.stack);

     }
})();