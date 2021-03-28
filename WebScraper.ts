/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-22 22:33:05
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-03-28 10:30:36
 * @ Description:
 */

require('dotenv').config();

var path = require('path');
const yn = require('yn');
var fs = require('fs');
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');
import fullPageScreenshot from "puppeteer-full-page-screenshot";
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
            "Août ",
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

        if (this.useStealth) {
            logger.info("Using stealth");
            puppeteer.use(pluginStealth());
        }
        else {
            logger.info("Not using stealth");
        }

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

        if (process.env.IN_DEV) {
            logger.info("using Windows Chrome browser");
            this.browser = await puppeteer.launch({
                headless: false,
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                args: ['--start-maximized', ...options]
            });
        }
        else {
            this.browser = await puppeteer.launch({
                headless: false,
                executablePath: "/usr/bin/google-chrome-stable",
                args: ['--no-xshm',
                    '--disable-dev-shm-usage',
                    '--no-first-run',
                    '--window-size=1920,1080', '--start-maximized', ...options]
            });
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
        logger.info('Stopping web client');

        if ("recycleCookies" in params && yn(params.recycleCookies)) {
            const cookies = await this.page.cookies();
            const filePath = this.translator.translate("recycledCookieFile");

            logger.info(`Saving cookies to ${filePath}`);
            await fs.writeFile(filePath, JSON.stringify(cookies, null, 2), () => { });
        }

        await this.browser.close();
    }

    async takeScreenShot(className) {
        var imageName = `${className}-${Date.now()}.png`;
        logger.info("Taking website screenshot with filename " + imageName);
        var imagePath = path.join(__dirname, 'screenshots', imageName);
        await fullPageScreenshot(this.page, { path: imagePath });
        return "https://scraperbox.be/screenshots/" + imageName;
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
            await this.page.waitFor(500);

            await this.page.waitForXPath(xpath, { visible: true });

            const linkHandlers = await this.page.$x(xpath);

            if (linkHandlers.length > 0) {
                await this.page.waitFor(500);
                return linkHandlers[0].click();
            } else {
                throw new Error("xpath not found");
            }
        }
        catch (ex) { }
    }

    async clickElementByXpath(xpath) {
        logger.info("Clicking element with xpath " + xpath);
        await this.page.waitFor(500);
        await this.page.waitForXPath(xpath, { visible: true });

        const linkHandlers = await this.page.$x(xpath);

        if (linkHandlers.length > 0) {
            await this.page.waitFor(500);
            return linkHandlers[0].click();
        } else {
            throw new Error("xpath not found");
        }
    }

    async getElementByXpath(xpath) {
        logger.info("Getting element with xpath " + xpath);
        await this.page.waitFor(500);
        await this.page.waitForXPath(xpath);

        const linkHandlers = await this.page.$x(xpath);

        if (linkHandlers.length > 0) {

            return linkHandlers[0];
        }

        return null;
    }

    //check if text in page
    async isTextInPage(text) {
        try {
            if ((await this.page.waitForXPath('//*[contains(text(), "' + text + '")]', { timeout: 1500 })) !== null) {

                return true;
            }
        }
        catch (exception) {
            return false;
        }
    }

    async isXpathInPage(xpath) {
        logger.info("Checking if xpath in page: " + xpath)
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
        await this.page.waitForXPath(xpath_expression);
        const links = await this.page.$x(xpath_expression);
        const link_urls = await this.page.evaluate((...links) => {
            return links.map(e => e.textContent);
        }, ...links);

        return link_urls;
    }

    async clickElementByText(text: string) {
        return this.clickElementByXpath("//*[text() = '" + text + "']");
    }


    async clickOptionalElementByText(text: string) {

        await this.clickOptionalElementByXpath("//*[contains(text(),'" + text + "')]");
    }

    async clickElementByTextContains(text: string) {
        return this.clickElementByXpath("//*[contains(text(), '" + text + "')]");
    }


    async getElementByCss(css) {
        await this.page.waitFor(500);
        await this.page.waitForSelector(css, { visible: true });
        return this.page.$(css);
    }

    async getElementsByCss(css) {
        await this.page.waitFor(500);
        await this.page.waitForSelector(css, { visible: true });
        return this.page.$$(css);
    }

    async getElementsTextByCss(css) {
        logger.info(`Getting elements by CSS ${css}`);
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
        let element = await elem.$(css);
        return this.page.evaluate(el => el.textContent, element)
    }

    async getTextsFromElementByCss(css: string, elem: any) {
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
        logger.info("Clicking element by CSS " + css);
        await this.page.waitForSelector(css, { timeout: 5000, visible: true });

        return this.page.click(css);
    }

    async clickOptionalElementByCss(css) {

        logger.info("Clicking optional element by CSS " + css);

        try {
            await this.page.waitForSelector(css, { timeout: 5000, visible: true });
            await this.page.click(css);
        } catch (ex) { }
    }

    async getElementTextByCss(css) {
        const elem = await this.getElementByCss(css);
        return this.page.evaluate(el => {
            return el.textContent;
        }, elem);
    }

    async getElementsByXpath(xpath) {
        await this.page.waitFor(1000);
        await this.page.waitForXPath(xpath);
        return this.page.$x(xpath);
    }

    async getElementTextByXpath(xpath: string) {
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