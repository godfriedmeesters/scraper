/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-22 22:33:06
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-04-06 18:21:03
 * @ Description:
 */


var path = require('path');
import { logger } from './logger';

import { uploadScreenshotsToFTP } from "./ftp";
require('dotenv').config();

const wdio = require('webdriverio');

class AppScraper {
    scrapeOnlyWeb: boolean;
    logger: any;
    monaten: string[];
    appiumClient: any = null;
    desiredCapabilities: any;

    constructor(desiredCapabilities: any) {
        this.desiredCapabilities = desiredCapabilities;

        this.monaten = [
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
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    async takeScreenShot(className) {
        const imageName = `${className}-${Date.now()}.png`;
        logger.info("Taking screenshot " + imageName);
        var imagePath = path.join(__dirname, 'screenshots', imageName);

        await this.appiumClient.saveScreenshot(imagePath);

        return "https://scraperbox.be/screenshots/" + imageName;
    }

    async startClient() {
        logger.info('Starting APP client');

        const jsonDesiredCaps = JSON.parse(this.desiredCapabilities);
        jsonDesiredCaps.deviceName = process.env.DEVICE_NAME;

        const appiumOpts = {
            hostname: process.env.APPIUM_HOST,
            path: '/wd/hub',
            port: 4723,
            capabilities: jsonDesiredCaps,
            logLevel: "warn"
        };

        this.appiumClient = await wdio.remote(appiumOpts);

        //Amsterdam
        // this.appiumClient.setGeoLocation({ latitude: "52.3667", longitude: "4.8945", altitude: "94.23" }); // Must be a driver that implements LocationContext

        try { await this.appiumClient.unlock(); } catch (ex) { }

    }

    async transferScreenshotsToFtp() {
        logger.info("Sending screenshots to FTP");
        uploadScreenshotsToFTP();
    }

    async stopClient() {


        if (this.appiumClient != null) {
            logger.info('Stopping app client');
            await this.appiumClient.closeApp();
            await this.appiumClient.deleteSession();
        }
    }

    async clickLink(linkText: string) {
        logger.info(`Clicking link ${linkText}`);
        let link = await this.appiumClient.$(
            this._('text("' + linkText + '")')
        );

        return link.click();
    }

    async clickOptionalLink(linkText: string) {
        logger.info(`Clicking optional link ${linkText}`);
        try {
            this.appiumClient.setImplicitTimeout(1000);
            let link = await this.appiumClient.$(
                this._('text("' + linkText + '")')
            );

            await link.click();
        } catch (ex) { }
        finally {
            this.appiumClient.setImplicitTimeout(parseInt(process.env.DEFAULT_APPIUM_TIMEOUT));
        }
    }

    async clickOptionalLinkByResourceId(resourceId: string) {
        logger.info(`Clicking link by resource id ${resourceId}`);
        try {
            this.appiumClient.setImplicitTimeout(1000);
            let link = await this.appiumClient.$('android=new UiSelector().resourceId("' + resourceId + '")');

            await link.click();
        } catch (ex) { }
        finally {
            this.appiumClient.setImplicitTimeout(parseInt(process.env.DEFAULT_APPIUM_TIMEOUT));
        }
    }

    _(selector: string) {
        return `android=new UiSelector().${selector}`;
    }

    async getElementByResourceId(resourceId) {
        logger.info(`get element by resource id ${resourceId}`);
        return this.appiumClient.$(
            'android=new UiSelector().resourceId("' + resourceId + '")'
        );
    }

    async getElementsByResourceId(resourceId) {
        logger.info(`get elements by resource id ${resourceId}`);
        return this.appiumClient.$$(
            'android=new UiSelector().resourceId("' + resourceId + '")'
        );
    }



    async clickElementByResource(resourceId) {
        logger.info(`click element by resource id ${resourceId}`);
        const element = await this.appiumClient.$(
            'android=new UiSelector().resourceId("' + resourceId + '")'
        );

        return element.click();
    }

    async clickElementByXpath(xpath) {
        logger.info("Clicking xpath " + xpath);
        const element = await this.appiumClient.$(xpath
        );

        return element.click();
    }


    async scrollIntoView(text) {
        logger.info("scrolling into view " + text);
        return this.appiumClient.$(
            'android=new UiScrollable(new UiSelector()' +
            '.resourceId("android:id/content")).scrollIntoView(' +
            'new UiSelector().text("' + text +
            '"));'
        );
    }

    async scrollDescIntoView(text) {
        const sel = 'android=new UiScrollable(new UiSelector()' +
            '.resourceId("com.booking:id/bui_calendar_view")).scrollDescriptionIntoView("' +
            + text + '");'

        logger.info("scrolling into view with conten-desc, sel =" + text);
        return this.appiumClient.$(sel
        );
    }

    async scrollDownUntilDescVisible(desc) {
        logger.info(`scroll down until @desc visible ${desc}`);

        var rect = await this.appiumClient.getWindowRect();


        var rectX = rect.width / 2;
        var rectY = rect.height / 1.1;

        let textVisible = false;
        this.appiumClient.setImplicitTimeout(2000);
        while (!textVisible) {
            const elem = await this.appiumClient.$(
                this._('description("' + desc + '")')
            );

            let loc = null;

            if (elem.elementId == null) {
                textVisible = false;
                logger.debug('element  not found, continuing scroll');
                //loc = await elem.getLocation();

            } else {
                textVisible = true;
                break;
            }
            await this.appiumClient.touchAction([
                { action: 'press', x: rectX, y: rectY * 0.6 },
                { action: 'wait', ms: 500 },
                { action: 'moveTo', x: rectX, y: rectY * 0.4 },
                'release',
            ]);
        }

        this.appiumClient.setImplicitTimeout(parseInt(process.env.DEFAULT_APPIUM_TIMEOUT));

    }



    async scrollDownUntilVisible(text) {
        logger.info(`scroll down until text visible ${text}`);
        var rect = await this.appiumClient.getWindowRect();
        var rectX = rect.width / 2;
        var rectY = rect.height / 1.1;

        let textVisible = false;
        this.appiumClient.setImplicitTimeout(2000);
        while (!textVisible) {
            const elem = await this.appiumClient.$(
                this._('text("' + text + '")')
            );

            let loc = null;

            if (elem.elementId == null) {
                textVisible = false;
                logger.debug('element  not found, continuing scroll');


            } else {
                textVisible = true;
                break;
            }
            await this.appiumClient.touchAction([
                { action: 'press', x: rectX, y: rectY * 0.6 },
                { action: 'wait', ms: 500 },
                { action: 'moveTo', x: rectX, y: rectY * 0.4 },
                'release',
            ]);
        }

        this.appiumClient.setImplicitTimeout(parseInt(process.env.DEFAULT_APPIUM_TIMEOUT));

    }


    async scrollUpUntilTextVisible(text) {

        var rect = await this.appiumClient.getWindowRect();

        var rectX = rect.width / 2;
        var rectY = rect.height / 1.1;

        let textVisible = false;
        this.appiumClient.setImplicitTimeout(2000);
        while (!textVisible) {
            const elem = await this.appiumClient.$(
                this._('text("' + text + '")')
            );

            let loc = null;

            if (elem.elementId == null) {
                textVisible = false;
                logger.debug('element  not found, continuing scroll');
                //loc = await elem.getLocation();

            } else {
                textVisible = true;
                break;
            }
            await this.appiumClient.touchAction([
                { action: 'press', x: rectX, y: rectY * 0.4 },
                { action: 'wait', ms: 500 },
                { action: 'moveTo', x: rectX, y: rectY * 0.6 },
                'release',
            ]);
        }

        this.appiumClient.setImplicitTimeout(parseInt(process.env.DEFAULT_APPIUM_TIMEOUT));

    }


    async getElement(elementText: string) {
        return this.appiumClient.$(
            this._('text("' + elementText + '")')
        );
    }

    async appClickElementByResource(resourceId) {
        const element = await this.appiumClient.$(
            'android=new UiSelector().resourceId("' + resourceId + '")'
        );

        return element.click();
    }

    async appClickElementByXpath(xpath: string) {
        const element = await this.appiumClient.$(xpath
        );

        return element.click();
    }

    async getElementTextByXpath(xpath) {
        const element = await this.appiumClient.$(xpath
        );

        return element.getText();
    }

    async getElementByXpath(xpath) {
        this.sleep(500);
        return this.appiumClient.$(xpath
        );
    }

    async getAttrTextByXpath(xpath, attr) {
        const elem = await this.appiumClient.$(xpath
        );
        const att = await elem.getAttribute(attr);
        return att.trim();
    }

    async appScrollDownUntilVisible(text: string) {
        logger.info("scrolling down until " + text + " not visible");
        let textVisible = false;
        this.appiumClient.setImplicitTimeout(2000);
        while (!textVisible) {
            const elem = await this.appiumClient.$(
                this._('text("' + text + '")')
            );


            let loc = null;

            if (elem.elementId == null) {
                textVisible = false;
                logger.debug('element  found, stopping scroll');
                break;
            } else {
                loc = await elem.getLocation();
            }

            await this.appiumClient.touchAction([
                { action: 'press', x: loc.x, y: loc.y },
                { action: 'wait', ms: 200 },
                { action: 'moveTo', x: loc.x, y: loc.y - 100 },
                'release',
            ]);
        }

    }

    async clickCoordinates(x, y) {
        await this.appiumClient.touchAction([
            { action: 'tap', x, y }
        ]);
    }

    async scrollDownUntilNotVisible(text, offset = 100) {
        let textVisible = true;
        this.appiumClient.setImplicitTimeout(2000);
        while (textVisible) {
            const elem = await this.appiumClient.$(
                this._('text("' + text + '")')
            );

            let loc = null;

            if (elem.elementId == null) {
                textVisible = false;
                logger.debug('text not found, stopping scroll');
                break;
            } else {
                loc = await elem.getLocation();
            }

            await this.appiumClient.touchAction([
                { action: 'press', x: loc.x, y: loc.y },
                { action: 'wait', ms: 500 },
                { action: 'moveTo', x: loc.x, y: loc.y - offset },
                'release',
            ]);
        }
    }


}

export { AppScraper }