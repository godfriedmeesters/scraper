/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-22 22:33:06
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-01-28 14:40:36
 * @ Description:
 */

//TODO only disable stealth for opodo
import { WebScraper } from "../WebScraper";
import { IScraper } from "../IScraper";
import { FlightOffer } from "../types";

import { logger } from '../logger';
var path = require('path');

export class OpodoWebScraper extends WebScraper implements IScraper {

    constructor() { super(path.join(__dirname, "lang.json")); }

    async scrapeUntilSearch(inputData: any) {

        const departureDate = new Date(inputData.departureDate);
        const origin = inputData.origin;
        const destination = inputData.destination;

        await this.page.goto(this.translator.translate("url"));
        await this.page.waitFor(5000);
        await this.clickOptionalElementByCss('#didomi-notice-agree-button');
        await this.page.waitFor(1000);
        await this.clickElementByXpath(`//div[contains(text(), '${this.translator.translate("Nur Hinflug")}')]`);
        await this.page.waitFor(2000);

        await this.clickElementByXpath("//label[@for='direct-flight-switcher']");

        // //input[@placeholder='Von?']
        //input[@placeholder='Nach?']
        // //input[@placeholder='Hinflug']
        await this.page.waitFor(1000);
        const from = await this.getElementByXpath("//input[@placeholder='Von?']");

        await this.page.waitFor(500);
        await from.type(origin, { delay: 50 });
        await this.page.waitFor(3000);
        await this.tapEnter();

        await this.page.waitFor(3000);

        const to = await this.getElementByXpath("//input[@placeholder='Nach?']");
        await to.type(destination, { delay: 50 });
        await this.page.waitFor(3000)
        await this.tapEnter();
        await this.page.waitFor(3000);

        let isStrMonthFound = false;

        const dp = await this.getElementByXpath("//input[@placeholder='Hinflug']");

        await this.page.waitFor(3000);



        const shortMonthNames = this.language == "de" ? this.shortMonthNamesDe : this.shortMonthNamesFr;

        const strLookForMonth = shortMonthNames[departureDate.getMonth()].replace(".", "");

        logger.info("Scrolling to the right month...");
        while (!isStrMonthFound) {
            const strMonths = await this.getElementsTextByCss(".odf-calendar-title");

            for (var strMonth of strMonths) {
                if (strMonth.includes(strLookForMonth)) {
                    isStrMonthFound = true;
                    break;
                }
            }

            logger.info('clicking next');
            await this.clickElementByXpath("//span[@glyph='arrow-right']");

            await this.page.waitFor(1000);
        }
        logger.info("Clicking the day...");
        await this.clickElementByXpath(`//div[@class='odf-calendar']//div[@class = 'odf-calendar-title' and contains(text(), '${strLookForMonth}')]/following-sibling::div//div[contains(@class,'odf-calendar-day') and text() = '${departureDate.getDate()}']`);

    }


    async scrapeFromSearch(inputData) {
        await this.clickElementByText("Flug suchen");
        await this.page.waitFor(5000);

        await this.clickOptionalElementByText("UNDERSTOOD");
        await this.page.waitFor(15000);

         //take screenshot
         var screenshotPath = await this.takeScreenShot("OpodoWebScraper");

        const depArrTimes = await this.getTextArrayFromXpath("//div[@data-testid='itinerary']//*[contains(text(),':')]");
        const depArrLocations = await this.getTextArrayFromXpath("//div[@data-testid='itinerary']//*[contains(text(),'(')]");
        const prices = await this.getTextArrayFromXpath("//div[@data-testid='itinerary']//span[contains(text(), '€') and contains(text(),',')]");
        const airlines = await this.getElementsByXpath("//div[@data-testid='itinerary']//img");




        var flightOffers = [];

         logger.info("Got " + prices.length +  " prices");
         logger.info("Got " + depArrLocations.length +  " depArrLocations");
         logger.info("Got " + depArrTimes.length +  " depArrTimes");
         logger.info("Got " + airlines.length +  "  airlines");


        const url = this.page.url();
        for (var i = 0, j = 0; i < prices.length; i++, j += 2) {
            var flightOffer = new FlightOffer();
            flightOffer.screenshot = screenshotPath;
            flightOffer.departureTime = depArrTimes[j].trim();
            flightOffer.arrivalTime = depArrTimes[j + 1].trim();
            flightOffer.airline = "teest"; //await airlines[i].getAttribute("alt");
            flightOffer.origin = depArrLocations[j].match(/\(([^)]+)\)/)[1].trim();
            flightOffer.destination = depArrLocations[j + 1].match(/\(([^)]+)\)/)[1].trim();
            flightOffer.price = prices[i].trim().replace("€", "");
            flightOffer.url = url;
            flightOffers.push(flightOffer);
        }

        return flightOffers;

    }
}

