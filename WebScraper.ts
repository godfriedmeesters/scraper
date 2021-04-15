/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-22 22:33:05
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-04-15 07:54:00
 * @ Description:
 */


require('dotenv').config();

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


    async startClient(params) {
        let locale = '--lang=de-DE,de';

        this.language = "de";


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


        var options = [];

        if ("language" in params && params.language == "fr") {
            locale = '--lang=fr-FR,fr';
            options.push(locale);
            this.language = "fr";
            this.translator.changeLanguage("fr");
        }

        logger.info("Using language " + this.language);

        if ("proxy" in params) {
            options.push(`--proxy-server=${params.proxy}`);
        }

        logger.info("starting web client with options {" + options + "}");

        if (yn(process.env.IN_DEV)) {
            logger.info("using Windows Chrome browser");
            this.browser = await puppeteer.launch({
                headless: false,
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                args: ['--start-maximized', ...options]
            });
        }
        else {
            // if ("headful" in params) {
            //     logger.info("using Linux headful browser");
            //     this.browser = await puppeteer.launch({
            //         headless: false,
            //         executablePath: "/usr/bin/google-chrome-stable",
            //         args: ['--no-xshm',
            //             '--disable-dev-shm-usage',
            //             '--no-first-run',
            //             '--window-size=1920,1080', '--start-maximized', ...options]
            //     });
            // }
            // else {
            logger.info("using headless browser");
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--window-size=1920,1080', '--start-maximized', '--no-sandbox', ...options]
            });

            //}
        }

        this.page = await this.browser.newPage();

        this.page.on('response', (response) => {
            if (parseInt(response.status()) >= 400) {
                logger.error("Getting page " + response.request().url() + " resulted in status code " + response.status());
            }
        })

        if ("useAuthCookies" in params && yn(params.useAuthCookies)) {
            logger.info("Using authentication cookies...");
            const cookiesString = fs.readFileSync(this.translator.translate("authCookieFile"));
            const cookies = JSON.parse(cookiesString);
            await this.page.setCookie(...cookies);
        }


        if ("recycleCookies" in params && yn(params.recycleCookies)) {
            if (fs.existsSync(this.translator.translate("recycledCookieFile"))) {
                logger.info(`Recycling cookies from ${this.translator.translate("recycledCookieFile")} ...`);
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


        if ("recycleCookies" in params && yn(params.recycleCookies)) {
            const cookies = await this.page.cookies();
            const filePath = this.translator.translate("recycledCookieFile");

            logger.info(`Saving cookies to ${filePath}`);
            await fs.writeFile(filePath, JSON.stringify(cookies, null, 2), () => { });
        }

        if (this.browser != null) {
            logger.info('Stopping web client');
            await this.browser.close();
        }
    }

    async takeScreenShot(className) {
        var imageName = `${className}-${Date.now()}.png`;
        logger.info("Taking website screenshot with filename " + imageName);
        var imagePath = path.join(__dirname, 'screenshots', imageName);
        if (this.page != null) {
            await this.page.waitFor(500);
            await this.page.screenshot({ path: imagePath, fullPage: true });
            return "https://scraperbox.be/screenshots/" + imageName;
        }
        return "no screenshot possible";
    }

    async transferScreenshotsToFtp() {
        await this.sleep(1000);
        logger.info("Sending screenshots to FTP");
        uploadScreenshotsToFTP();
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async clickOptionalElementByXpath(xpath) {
        try {
            await this.page.waitFor(1000);


            const linkHandlers = await this.page.$x(xpath);

            if (linkHandlers.length > 0) {

                return linkHandlers[0].click();
            } else {
                throw new Error("xpath not found");
            }
        }
        catch (ex) { }
    }

    async clickElementByXpath(xpath) {
        logger.info("Waiting for element with xpath " + xpath);
        await this.page.waitFor(1000);

        const linkHandlers = await this.page.$x(xpath);

        if (linkHandlers.length > 0) {
            logger.info("Clicking element with xpath " + xpath);
            // await this.page.waitFor(500);
            return linkHandlers[0].click();
        } else {
            throw new Error("xpath not found");
        }
    }

    async getElementByXpath(xpath) {
        logger.info("Getting element with xpath " + xpath);
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

    async isXpathInPage(xpath) {
        logger.info("Checking if xpath in page: " + xpath)
        await this.page.waitFor(1000);
        try {
            if ((await this.page.waitForXPath(xpath, { timeout: 500 })) !== null) {
                return true;
            }
        }
        catch (exception) {
            return false;
        }
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
        logger.info(`click element by text  ${text}`);
        await this.page.waitFor(500);
        return this.clickElementByXpath("//*[text() = '" + text + "']");
    }


    async clickOptionalElementByText(text: string) {

        await this.clickOptionalElementByXpath("//*[contains(text(),'" + text + "')]");
    }

    async clickElementByTextContains(text: string) {
        logger.info(`click element by text contains ${text}`);
        return this.clickElementByXpath("//*[contains(text(), '" + text + "')]");
    }


    async getElementByCss(css) {
        logger.info(`Get element by css ${css}`);
        await this.page.waitFor(500);
        await this.page.waitForSelector(css, { visible: true });
        return this.page.$(css);
    }

    async getElementsByCss(css) {
        logger.info(`Get elements by css ${css}`);
        await this.page.waitFor(500);
        await this.page.waitForSelector(css, { visible: true });
        return this.page.$$(css);
    }

    async getElementsTextByCss(css) {
        logger.info(`Getting elements' text by CSS ${css}`);
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
        logger.info(`Get text from element by css ${css}`);
        let element = await elem.$(css);
        return this.page.evaluate(el => el.textContent, element)
    }

    async getTextsFromElementByCss(css: string, elem: any) {
        logger.info(`Get texts from elements by css ${css}`);
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
        logger.info(`Click element by css ${css}`);
        const elem = await this.page.waitForSelector(css, { visible: true });

        await this.page.waitFor(500);
        return this.page.click(css);
    }

    async clickOptionalElementByCss(css) {
        logger.info(`Click optional element by css ${css}`);
        try {
            logger.info(`Waiting for css selector ${css}`);
            await this.page.waitForSelector(css, { timeout: 5000, visible: true });
            logger.info(`Clicking css selector ${css}`);
            return this.page.click(css);
        } catch (ex) { }
    }

    async getElementTextByCss(css) {
        logger.info(`get element text by css ${css}`);
        const elem = await this.getElementByCss(css);
        return this.page.evaluate(el => {
            return el.textContent;
        }, elem);
    }

    async getElementsByXpath(xpath) {
        logger.info(`get elements  by xpath ${xpath}`);
        await this.page.waitFor(1000);
        await this.page.waitForXPath(xpath, { timeout: 500 });
        return this.page.$x(xpath);
    }

    async getElementTextByXpath(xpath: string) {
        logger.info(`get elements text by xpath ${xpath}`);
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