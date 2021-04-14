/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-27 16:00:25
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-04-14 23:48:44
 * @ Description:
 */


import { WebScraper } from "../../WebScraper";
import dateFormat from 'dateformat';
import { IScraper } from "../../IScraper";
import { FlightOffer } from "../../types";
import { logger } from "../../logger";
var path = require('path');


export class KayakWebScraper extends WebScraper implements IScraper {

    //TODO handle different cookie handlers
    constructor() { super(path.join(__dirname, "lang.json")); }

    // scrape web part 1: until "clicking" the search button
    async scrapeUntilSearch(inputData: any) {
        const departureDate = inputData.departureDate;
        const origin = inputData.origin;
        const destination = inputData.destination;

        await this.page.goto(this.translator.translate("url"));

        await this.page.waitFor(2000);

        await this.clickOptionalElementByCss(`//*[contains(@title, '${this.translator.translate("Akzeptieren")}')]`);
        await this.clickOptionalElementByText(this.translator.translate("Akzeptieren"));


        await this.clickOptionalElementByCss('#onetrust-accept-btn-handler');

        await this.clickOptionalElementByCss('.awaitBsvt-accept');
        await this.page.waitFor(1000);

        const test = await this.isXpathInPage("//div[@data-value='roundtrip']");
        if (test) {
            logger.info("DETECTED //div[@data-value='roundtrip']");
            await this.clickElementByXpath("//div[@data-value='roundtrip']");
            await this.clickElementByXpath("//li[@data-value='oneway']");
        }
        else {
            throw new Error("FATAL ERROR: KAYAK WEB BEHAVING UNEXPECTEDLY");
        }


        //        await this.clickElementByCss(".col-switch");
        //  await this.clickElementByText(this.translator.translate("Hin- und Rückflug"));

        // const tst2 = await this.isXpathInPage(`//div[div/span[text()='${this.translator.translate('Hin- und Rückflug')}']]`);

        // if (tst2) {
        //     await this.page.waitFor(3000);
        //     await this.clickElementByXpath(`//div[div/span[text()='${this.translator.translate('Hin- und Rückflug')}']]`);
        //     await this.page.waitFor(3000);
        //     await this.clickElementByXpath(`//*[text()='${this.translator.translate('Nur Hinflug')}']`);

        // }
        // else {
        //     await this.page.waitFor(3000);
        //     await this.clickElementByXpath(`//div[div[text()='${this.translator.translate('Hin- und Rückflug')}']]`);
        //     await this.page.waitFor(3000);
        //     await this.clickElementByXpath(`//li[@data-title='${this.translator.translate('Nur Hinflug')}']`);



        // }



        const from1 = await this.page.$x("//input[contains(@id, 'origin-airport')]");
        await from1[0].type(origin, { delay: 50 });
        await this.tapEnter();

        await this.page.waitFor(500);
        await this.clickElementByXpath("//div[contains(@id, 'destination-airport')]");
        await this.page.waitFor(500);

        const to1 = await this.page.$x("//input[contains(@id, 'destination-airport')]");
        await to1[0].type(destination, { delay: 50 });
        await this.tapEnter();

        await this.page.waitFor(500);

        await this.clickElementByXpath("//div[contains(@id, 'dateRangeInput-display')]");

        this.page.waitFor(500);
        const selDate = await this.getElementByXpath(`//div[contains(@aria-label, '${this.translator.translate("Eingabe Abflugdatum")}')]`);

        this.page.waitFor(5000);
        if (this.language == "de")
            await selDate.type(dateFormat(new Date(departureDate), 'dd.mm.yyyy'), { delay: 50 });
        else
            await selDate.type(dateFormat(new Date(departureDate), 'dd/mm/yyyy'), { delay: 50 });


        await this.tapEnter();

        this.page.waitFor(500);

    }

    // scrape web part 2: from "clicking" on search button
    async scrapeFromSearch(inputData) {



        await this.clickElementByXpath(`//button[contains(@title, '${this.translator.translate("Flüge suchen")}')]`);

        await this.page.waitFor(15000);

        await this.tapEnter();

        await this.clickOptionalElementByXpath('//input[@type="checkbox" and @name="1"]');
        await this.page.waitFor(2000);
        await this.clickOptionalElementByXpath('//input[@type="checkbox" and @name="2"]');
        await this.page.waitFor(2000);

        await this.tapEnter();

        const offersSortedByBest = await this.extractOffers();

        await this.clickElementByXpath(` //span[contains(text(),'${this.translator.translate("Günstigste Option")}')]`);

        const offersSortedByCheapest = await this.extractOffers();

        return { 'sortedByBest': offersSortedByBest, 'sortedByCheapest': offersSortedByCheapest };
    }


    async extractOffers() {


        // load all offers
        var moreFound = true;

        while (moreFound) {
            try {
                var moreButton = await this.page.waitForSelector('.moreButton', {
                    visible: true, timeout: 5000
                });

                await this.page.focus('.moreButton');

                await moreButton.click();
                console.log("more found");
                this.page.waitFor(2000);
            }
            catch (ex) {

                logger.info("reached max page");
                moreFound = false;
            }
        }

        var offerNodes = await this.page.$$(".resultInner");
        //take screenshot
        var screenshot = await this.takeScreenShot(this.constructor.name);

        const flightOffers = await Promise.all(
            offerNodes.map(async (offerNode: any) => {
                var flightOffer = new FlightOffer();
                //const time = await this.getTextFromElementByCss('bw-itinerary-times-info', offerNode);
                flightOffer.departureTime = await this.getTextFromElementByCss('.base-time', offerNode);
                flightOffer.arrivalTime = await this.getTextFromElementByCss('.arrival-time', offerNode);

                const origDest = await this.getTextsFromElementByCss(".bottom-airport",
                    offerNode);

                flightOffer.origin = origDest[0].split("\n")[0];

                flightOffer.destination = origDest[1].split("\n")[0];
                const al = await this.getTextFromElementByCss(".codeshares-airline-names", offerNode);

                flightOffer.airline = al.trim();

                const price = await this.getTextFromElementByCss('.price-text', offerNode);
                flightOffer.price = price.trim();
                flightOffer.screenshot = screenshot;

                return flightOffer;
            })
        );
        return flightOffers;

    }
}