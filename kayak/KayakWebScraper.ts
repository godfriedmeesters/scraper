
import { WebScraper } from "../WebScraper";
import dateFormat from 'dateformat';
import { IScraper } from "../IScraper";
import { FlightOffer, OfferList } from "../types";
const fs = require('fs');
var path = require('path');


export class KayakWebScraper extends WebScraper implements IScraper {
    constructor() { super(path.join(__dirname, "lang.json")); }

    // scrape web part 1: until "clicking" the search button
    async scrapeUntilSearch(inputData: any) {
        const departureDate = inputData.departureDate;
        const origin = inputData.origin;
        const destination = inputData.destination;

        await this.page.goto(this.translator.translate("url"));

        await this.clickElementByXpath(`//button[contains(@title, '${this.translator.translate("Akzeptieren")}')]`);

        await this.clickElementByXpath("//div[contains(@id, 'switch')]");

        await this.clickElementByXpath("//li[contains(@data-value, 'oneway')]");

        await this.clickElementByXpath("//button[contains(@class, 'remove-selection')]");

        await this.page.waitFor(500);

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
        // await this.clickElementByXpath("//span[contains(text(), 'eDreams')]");

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


        // load all offers
        var moreFound = true;

        while (moreFound) {
            try {
                var moreButton = await this.page.waitForSelector('.moreButton', {
                    visible: true, timeout: 5000
                });
                ///
                await this.page.focus('.moreButton');


                ////
                await moreButton.click();
                console.log("more found");
                this.page.waitFor(2000);
            }
            catch (ex) {

                console.log("finished");
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

                flightOffer.origin = origDest[0];

                flightOffer.destination = origDest[1];
                const al = await this.getTextFromElementByCss(".section.times .bottom", offerNode);

                flightOffer.airline = al.trim();

                const price = await this.getTextFromElementByCss('.price-text', offerNode);
                flightOffer.price = price.replace("€", "").trim();
                flightOffer.screenshot = screenshot;

                return flightOffer;
            })
        );

        return flightOffers;
    }
}
