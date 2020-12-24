require('dotenv').config();

var path = require('path');
var fs = require('fs');
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');
import fullPageScreenshot from "puppeteer-full-page-screenshot";
import Translator from "simple-translator";

//const pptr = require('puppeteer-core');

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

    constructor(langFilePath: string = null) {
        puppeteer.use(pluginStealth());

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


        Translator.registerDefaultLanguage("de", obj.de);
        Translator.registerLanguage("fr", obj.fr);
        this.translator = Translator;
    }



    async startClient(language?: string) {
        let locale = '--lang=de-DE,de';

        this.language = "de";

        if (language && language == "fr") {
            locale = '--lang=fr-FR,fr';
            this.language = "fr";
            this.translator.changeLanguage("fr");
        }



        logger.info("starting web client with locale " + locale);

        this.browser = await puppeteer.launch({
            headless: false,
            args: ['--start-maximized', `--lang=${locale}`, '--no-sandbox',   "--headless",
            "--disable-gpu",
            "--disable-dev-shm-usage",]
        });

        // this.browser = await pptr.launch({
        //     headless: false,
        //     executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
        // });

        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

        await this.page.setViewport({ width: 1920, height: 1080 });

        await this.page.setExtraHTTPHeaders({
            'Accept-Language': this.language
        });

        await this.page.setDefaultNavigationTimeout(process.env.DEFAULT_PUPPETEER_TIMEOUT);
        //await this.page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

    }

    async stopClient() {
        logger.info('Stopping web client');
        await this.browser.close();
    }


    async takeScreenShot(className) {
        var imageName = className + "-" + Date.now() + '.png';
        var imagePath = path.join(__dirname, 'screenshots', imageName);

        await fullPageScreenshot(this.page, { path: imagePath });

        return "https://scraperbox.be/screenshots/" + imageName;
    }



    async transferScreenshotsToFtp() {
        logger.info("Sending screenshots to FTP");
        uploadScreenshotsToFTP();
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
        await this.clickOptionalElementByXpath("//*[text() = '" + text + "']");
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
        const elem = await this.page.waitForSelector(css, { visible: true });

        await this.page.waitFor(500);
        return this.page.click(css);
    }

    async clickOptionalElementByCss(css) {
        try {
            const elem = await this.page.waitForSelector(css, { visible: true, timeout: 1000 });

            await this.page.waitFor(500);
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
            // get text content from scraped price 
            return el.textContent;
        }, elements[0]);
        return text;
    }

    async getElementsAttributeByXpath(xpath: string, attr: string) {
        const elements = await this.getElementsByXpath(xpath);
        var attrs = [];
        for (var element of elements) {
            const text = await this.page.evaluate((el, attr) => {
                // get text content from scraped price
                return el.getAttribute(attr);
            }, element, attr);

            attrs.push(text);
        }

        return attrs;
    }

    async getElementAttributeByCss(css: string, attr: string) {
        const element = await this.getElementByCss(css);

        const text = await this.page.evaluate((el, attr) => {
            // get text content from scraped price
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