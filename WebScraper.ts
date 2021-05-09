/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-22 22:33:05
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-05-09 18:29:35
 * @ Description:
 */


require('dotenv').config();
const os = require('os');

var path = require('path');
const yn = require('yn');
var fs = require('fs');
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')
import Translator from "simple-translator";

import { uploadScreenshotsToFTP } from "./ftp";
import { logger } from './logger';

class WebScraper {
    browser = null;
    page = null;
    logger = null;
    shortMonthNamesDe: string[];
    shortMonthNamesFr: string[];
    language: string = null;
    translator = null;
    dateformat = "";
    cookies = [];
    useStealth = true;


    constructor(langFilePath: string = null) {

        this.shortMonthNamesDe = [
            "Jan.",
            "Feb.",
            "März",
            "Apr.",
            "Mai",
            "Juni", "Juli",
            "Aug.",
            "Sep.",
            "Okt.",
            "Nov.",
            "Dez."];

        this.shortMonthNamesFr = [
            "Janv.",
            "Févr.",
            "Mars",
            "Avr.",
            "Mai",
            "Juin", "Juil.",
            "Août",
            "Sept.",
            "Oct.",
            "Nov.",
            "Déc."];


        var obj = JSON.parse(fs.readFileSync(langFilePath));

        if (langFilePath.includes("opodo"))
            this.useStealth = false;

        Translator.registerDefaultLanguage("de", obj.de);
        Translator.registerLanguage("fr", obj.fr);
        this.translator = Translator;
    }


    async logInfo(message) {
        const hostname = os.hostname;
        var url = "";
        if (this.page != null)
            url = await this.page.url();
        logger.info(`${hostname}: ${url} : ${message}`)
    }

    async logError(message) {
        const hostname = os.hostname;
        var url = "";
        if (this.page != null)
            url = await this.page.url();
        logger.error(`${hostname}: ${url} : ${message}`)
    }


    async startClient(params) {
        puppeteer.use(pluginStealth());

        puppeteer.use(
            RecaptchaPlugin({
                provider: {
                    id: '2captcha',
                    token: '85e1bcc364f29cc059e51680a2d46c0a', // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
                },
                visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
            })
        )

        let locale = '--lang=de-DE,de';

        this.language = "de";

        this.translator.changeLanguage("de");

        var options = [];

        if ("language" in params && params.language == "fr") {
            locale = '--lang=fr-FR,fr';
            this.language = "fr";
            this.translator.changeLanguage("fr");
        }

        options.push(locale);

        this.logInfo("Using language " + this.language);

        if ("proxy" in params) {
            options.push(`--proxy-server=${params.proxy}`);
        }


        this.logInfo("starting web client with options {" + options + "}");

        if (yn(process.env.IN_DEV)) {
            this.logInfo("using Windows Chrome browser");
            this.browser = await puppeteer.launch({
                headless: false,
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                args: ['--start-maximized', ...options]
            });
        }
        else {
            // if ("headful" in params) {
            this.logInfo("using Linux headful browser");
            this.browser = await puppeteer.launch({
                headless: false,
                timeout: 60000,
                executablePath: "/usr/bin/google-chrome-stable",
                args: ['--no-xshm',
                    '--disable-dev-shm-usage',
                    '--no-first-run',
                    '--window-size=1920,1080', '--start-maximized', "--remote-debugging-port=9222", ...options]
            });
            // }
            // else {
            // logInfo("using headless browser");
            // this.browser = await puppeteer.launch({
            //     headless: true,
            //     args: [
            //         '--window-size=1920,1080', '--start-maximized', '--no-sandbox', ...options]
            // });

            //}
        }

        this.page = await this.browser.newPage();

        await this.page.setExtraHTTPHeaders({
            'Accept-Language': this.language
        });


        this.page.on('response', (response) => {
            if (parseInt(response.status()) >= 400) {
                this.logError("Getting page " + response.request().url() + " resulted in status code " + response.status());
            }
        })

        if ("useAuthCookies" in params && yn(params.useAuthCookies)) {
            this.logInfo("Using authentication cookies...");
            const cookiesString = fs.readFileSync(this.translator.translate("authCookieFile"));
            const cookies = JSON.parse(cookiesString);
            await this.page.setCookie(...cookies);
        }


        if ("recycleCookies" in params && yn(params.recycleCookies)) {
            if (fs.existsSync(this.translator.translate("recycledCookieFile"))) {
                this.logInfo(`Recycling cookies from ${this.translator.translate("recycledCookieFile")} ...`);
                const cookiesString = fs.readFileSync(this.translator.translate("recycledCookieFile"));
                const cookies = JSON.parse(cookiesString);
                await this.page.setCookie(...cookies);
            }
        }

        await this.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

        await this.page.setViewport({ width: 1920, height: 1080 });

        await this.page.setExtraHTTPHeaders({
            'Accept-Language': this.language
        });

        await this.page.setDefaultNavigationTimeout(process.env.DEFAULT_PUPPETEER_TIMEOUT);
    }

    async stopClient(params) {
        var url = "";
        if (this.page != null)
            url = await this.page.url();
        this.logInfo("Stopping web client at " + url)

        if ("recycleCookies" in params && yn(params.recycleCookies)) {
            const cookies = await this.page.cookies();
            const filePath = this.translator.translate("recycledCookieFile");

            this.logInfo(`Saving cookies to ${filePath}`);
            await fs.writeFile(filePath, JSON.stringify(cookies, null, 2), () => { });
        }

        if (this.browser != null) {
            this.logInfo('Stopping web client');
            await this.page.close();
            await this.browser.close();
        }
    }

    async takeScreenShot(className) {
        var imageName = `${className}-${Date.now()}.png`;
        this.logInfo("Taking website screenshot with filename " + imageName);
        var imagePath = path.join(__dirname, 'screenshots', imageName);
        if (this.page != null) {
            await this.page.waitFor(500);
            await this.page.screenshot({ path: imagePath, fullPage: true });
            return "https://scraperbox.be/screenshots/" + imageName;
        }
        return "no screenshot possible";
    }

    async takeJsonScreenShot(className, json) {
        var fileName = `${className}-${Date.now()}.json`;
        this.logInfo("Taking website JSON screenshot with filename " + fileName);
        var filePath = path.join(__dirname, 'compressedScreenshots', fileName);

        fs.writeFileSync(filePath, json);
        return "https://scraperbox.be/screenshots/" + fileName;

    }



    async transferScreenshotsToFtp() {
        await this.sleep(1000);
        this.logInfo("Sending screenshots to FTP");
        uploadScreenshotsToFTP();
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async clickOptionalElementByXpath(xpath) {
        this.logInfo("Cliking optional element by xpath " + xpath);
        try {
            await this.page.waitFor(1000);


            const linkHandlers = await this.page.$x(xpath);

            if (linkHandlers.length > 0) {

                this.logInfo("Clicking " + linkHandlers[0]);
                await linkHandlers[0].click();
            } else {
                throw new Error("xpath not found");
            }
        }
        catch (ex) { }
    }

    async clickElementByXpath(xpath) {
        this.logInfo("Waiting for element with xpath " + xpath);
        await this.page.waitFor(1000);

        const linkHandlers = await this.page.$x(xpath, { timeout: 5000 });

        if (linkHandlers.length > 0) {
            this.logInfo("Clicking element with xpath " + xpath);
            await this.page.waitFor(500);
            return linkHandlers[0].click();
        } else {
            throw new Error("xpath not found");
        }
    }

    async getElementByXpath(xpath) {
        this.logInfo("Getting element with xpath " + xpath);
        await this.page.waitFor(1000);

        const linkHandlers = await this.page.$x(xpath);

        if (linkHandlers.length > 0) {

            return linkHandlers[0];
        }

        return null;
    }

    //check if text in page
    async isTextInPage(text) {
        try {
            if ((await this.page.waitForXPath('//*[contains(text(), "' + text + '")]', { timeout: 500 })) !== null) {

                return true;
            }
        }
        catch (exception) {
            return false;
        }
    }

    async clickOptionalElementByTextIgnoreCase(text) {
        return this.clickOptionalElementByXpath("//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '" + text + "')]");
    }

    async isTextInPageIgnoreCase(text) {

        try {
            if ((await this.page.waitForXPath("//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '" + text + "')]", { timeout: 2000 })) !== null) {

                return true;
            }
        }
        catch (exception) {
            return false;
        }

    }

    async isXpathInPage(xpath) {
        this.logInfo("Checking if xpath in page: " + xpath)
        await this.page.waitFor(1000);
        try {
            if ((await this.page.waitForXPath(xpath, { timeout: 5000 })) !== null) {
                return true;
            }
        }
        catch (exception) {
            return false;
        }

    }

    async saveContent(className) {
        if (this.page != null) {
            const html = await this.page.content();

            var fileName = `${className}-${Date.now()}.html`;
            var htmlPath = path.join(__dirname, 'html', fileName);
            fs.writeFileSync(htmlPath, html);

            return htmlPath;
        }

        return "not possible to save html"
    }

    async isCssInpage(css) {
        try {
            if ((await this.page.waitForSelector(css, { timeout: 500 })) !== null) {
                return true;
            }
        }
        catch (exception) {
            return false;
        }
    }

    async scrollCalendar(nextCss: string, needle: string) {
        var monthYearFound = await this.isTextInPage(needle);

        while (!monthYearFound) {
            await this.clickElementByCss(nextCss);
            monthYearFound = await this.isTextInPage(needle);
        }
    }

    async getTextArrayFromXpath(xpath) {
        const xpath_expression = xpath;
        await this.page.waitForXPath(xpath_expression, { timeout: 500 });
        const links = await this.page.$x(xpath_expression);
        const link_urls = await this.page.evaluate((...links) => {
            return links.map(e => e.textContent);
        }, ...links);

        return link_urls;
    }

    async clickElementByText(text: string) {
        this.logInfo(`click element by text  ${text}`);
        await this.page.waitFor(500);
        return this.clickElementByXpath("//*[text() = '" + text + "']");
    }


    async clickOptionalElementByText(text: string) {

        await this.clickOptionalElementByXpath("//*[contains(text(),'" + text + "')]");
    }



    async clickElementByTextContains(text: string) {
        this.logInfo(`click element by text contains ${text}`);
        return this.clickElementByXpath("//*[contains(text(), '" + text + "')]");
    }


    async getElementByCss(css) {
        this.logInfo(`Get element by css ${css}`);
        await this.page.waitFor(500);
        await this.page.waitForSelector(css, { visible: true });
        return this.page.$(css);
    }

    async getElementsByCss(css) {
        this.logInfo(`Get elements by css ${css}`);
        await this.page.waitFor(500);
        await this.page.waitForSelector(css, { visible: true });
        return this.page.$$(css);
    }

    async getElementsTextByCss(css) {
        this.logInfo(`Getting elements' text by CSS ${css}`);
        var elements = await this.getElementsByCss(css);
        var texts = [];

        for (var element of elements) {
            const txt = await this.page.evaluate(el => {
                return el.textContent;
            }, element);

            texts.push(txt);
        }

        return texts;
    }

    async getTextFromElementByCss(css: string, elem: any) {
        this.logInfo(`Get text from element by css ${css}`);
        let element = await elem.$(css);
        return this.page.evaluate(el => el.textContent, element)
    }

    async getTextsFromElementByCss(css: string, elem: any) {
        this.logInfo(`Get texts from elements by css ${css}`);
        let elements = await elem.$$(css);
        var txts = [];
        for (var elem of elements) {
            await this.page.waitFor(100);
            const txt = await this.page.evaluate(el => el.textContent, elem);
            txts.push(txt.trim());
        }

        return txts;
    }

    async clickElementByCss(css) {
        this.logInfo(`Click element by css ${css}`);
        const elem = await this.page.waitForSelector(css, { visible: true });

        await this.page.waitFor(500);
        return this.page.click(css);
    }

    async clickOptionalElementByCss(css) {
        this.logInfo(`Click optional element by css ${css}`);
        try {
            this.logInfo(`Waiting for css selector ${css}`);
            await this.page.waitForSelector(css, { timeout: 5000, visible: true });
            this.logInfo(`Clicking css selector ${css}`);
            return this.page.click(css);
        } catch (ex) { }
    }

    async getElementTextByCss(css) {
        this.logInfo(`get element text by css ${css}`);
        const elem = await this.getElementByCss(css);
        return this.page.evaluate(el => {
            return el.textContent;
        }, elem);
    }

    async getElementsByXpath(xpath) {
        this.logInfo(`get elements  by xpath ${xpath}`);
        await this.page.waitFor(1000);
        await this.page.waitForXPath(xpath, { timeout: 500 });
        return this.page.$x(xpath);
    }

    async getElementTextByXpath(xpath: string) {
        this.logInfo(`get elements text by xpath ${xpath}`);
        const elements = await this.getElementsByXpath(xpath);
        const text = await this.page.evaluate(el => {
            return el.textContent;
        }, elements[0]);
        return text;
    }

    async getElementsAttributeByXpath(xpath: string, attr: string) {
        const elements = await this.getElementsByXpath(xpath);
        var attrs = [];
        for (var element of elements) {
            const text = await this.page.evaluate((el, attr) => {
                return el.getAttribute(attr);
            }, element, attr);

            attrs.push(text);
        }

        return attrs;
    }

    async getElementAttributeByCss(css: string, attr: string) {
        const element = await this.getElementByCss(css);

        const text = await this.page.evaluate((el, attr) => {
            return el.getAttribute(attr);
        }, element, attr);


        return text;
    }

    async tapEnter() {
        await this.page.waitFor(1000);
        return this.page.keyboard.press('Enter');
    }
}

export { WebScraper }