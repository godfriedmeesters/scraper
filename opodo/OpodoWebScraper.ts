
import { WebScraper } from "../WebScraper";
import dateFormat from 'dateformat';
import { IScraper } from "../IScraper";
import { FlightOffer } from "../types";

import { logger } from '../logger';
var path = require('path');

export class OpodoWebScraper extends WebScraper implements IScraper {

    constructor() { super(path.join(__dirname, "lang.json")); }

    async scrapeUntilSearch(inputData: any) {

        const departureDate = inputData.departureDate;
        const origin = inputData.origin;
        const destination = inputData.destination;

        await this.page.goto(this.translator.translate("url"));
        await this.page.waitFor(1000);
        await this.clickOptionalElementByCss('#didomi-notice-agree-button');
        await this.page.waitFor(1000);
        await this.clickElementByXpath(`//div[contains(text(), '${this.translator.translate( "Nur Hinflug")}')]`);
        await this.page.waitFor(2000);

        await this.clickElementByCss(".od-directflights-selectable-label");

        const from = await this.page.$x("//input[@tabindex='11']");
        await this.page.waitFor(5000);
        await from[0].type(origin, { delay: 50 });
        await this.page.waitFor(3000);
        await this.tapEnter();

        await this.page.waitFor(3000);

        const to = await this.page.$x("//input[@tabindex='13']");
        await to[0].type(destination, { delay: 50 });
        await this.page.waitFor(3000)
        await this.tapEnter();
        await this.page.waitFor(3000);

        let dayFound = false;

        const dp = await this.page.$x("//div[@tabindex='14']");


        await this.page.waitFor(3000);

        const calendarDate = dateFormat(departureDate, "yyyy-mm-dd");


        while (!dayFound) {
            try {

                await this.clickElementByCss('.od-ui-calendar-day.day_' + calendarDate);

                dayFound = true;

            } catch (error) {

                logger.info('clicking next');
                await this.clickElementByXpath("//div[@class='arrow' and @data-direction='next']");
            }
            await this.page.waitFor(1000);

        }

    }


    async scrapeFromSearch(inputData) {
        await this.clickElementByText("Flug suchen ");
        await this.page.waitFor(5000);

        await this.clickOptionalElementByText("UNDERSTOOD");
        await this.page.waitFor(10000);

        //take screenshot
        var screenshotPath = await this.takeScreenShot("OpodoWebScraper");

        const depArrTimes = await this.getTextArrayFromXpath("//div[@data-testid='itinerary']//span[contains(text(),':')]");
        const depArrLocations = await this.getTextArrayFromXpath("//div[@data-testid='itinerary']//div[contains(text(),'(')]");
        const prices = await this.getTextArrayFromXpath("//div[@data-testid='itinerary']//span[@dir='auto']");
        //const airlines = await this.getTextArrayFromXpath("//div[@data-testid='itinerary']//img/@alt");
        const airlines = this.getElementsByXpath("//div[@data-testid='itinerary']//img");



        var flightOffers = [];

        const url = this.page.url();
        for (var i = 0, j = 0; i < prices.length; i++, j += 2) {
            var flightOffer = new FlightOffer();
            flightOffer.screenshot = screenshotPath;
            flightOffer.departureTime = depArrTimes[j].trim();
            flightOffer.arrivalTime = depArrTimes[j + 1].trim();
            flightOffer.airline = await airlines[i].getAttribute("alt");
            flightOffer.origin = depArrLocations[j].match(/\(([^)]+)\)/)[1].trim();
            flightOffer.destination = depArrLocations[j + 1].match(/\(([^)]+)\)/)[1].trim();
            flightOffer.price = prices[i].trim().replace("€", "");
            flightOffer.url = url;
            flightOffers.push(flightOffer);
        }

        return flightOffers;

    }
}

