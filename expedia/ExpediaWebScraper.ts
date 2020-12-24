
import { WebScraper } from "../WebScraper";
import date from 'date-and-time';
const de = require('date-and-time/locale/de');
import { IScraper } from "../IScraper";
import { FlightOffer } from "../types";
import { logger } from "../logger";
const fs = require('fs');
var convertTime = require('convert-time');
var path = require('path');

export class ExpediaWebScraper extends WebScraper implements IScraper {

    constructor() { super(path.join(__dirname, "lang.json")); }

    async scrapeUntilSearch(inputData: any) {

        const departureDate = inputData.departureDate;
        const depDate = new Date(departureDate);
        const origin = inputData.origin;
        const destination = inputData.destination;
        date.locale("de");

        await this.page.goto(this.translator.translate("url"));

        await this.clickElementByXpath("//a[@aria-controls='wizard-flight-pwa']");

        await this.clickElementByText(this.translator.translate("Nur Hinflug"));
        await this.clickElementByText(this.translator.translate('Abflughafen'));

        var elem = await this.getElementByXpath(`//input[contains(@placeholder,"${this.translator.translate('Wo starten Sie?')}")]`);
        await elem.type(origin);

        await this.clickElementByXpath("//button[@data-stid='location-field-leg1-origin-result-item-button']");

        await this.clickElementByText(this.translator.translate('Zielflughafen'));

        var elem = await this.getElementByXpath(`//input[contains(@placeholder,"${this.translator.translate('Wohin soll es gehen?')}")]`);
        await elem.type(destination);

        await this.clickElementByXpath("//button[@data-stid='location-field-leg1-destination-result-item-button']");

        await this.clickElementByText(this.translator.translate("Hinflug am"));

        const departureDay = depDate.getDate();

        const shortMonthNames = this.language == "de" ? this.shortMonthNamesDe : this.shortMonthNamesFr;

        let dt = "//button[@aria-label='" + departureDay + ". " + shortMonthNames[depDate.getMonth()] + " " + depDate.getFullYear() + "']";

        if (this.language == "fr") {
            dt = "//button[@aria-label='" + departureDay + " " + shortMonthNames[depDate.getMonth()].toLowerCase() + " " + depDate.getFullYear() + "']";
        }


        logger.info("Looking for date " + dt);

        var dateInPage: boolean = await this.isXpathInPage(dt);

        while (!dateInPage) {
            const butt = await this.page.$$('.uitk-button-paging');
            await butt[1].click();
            dateInPage = await this.isXpathInPage(dt);
        }
        await this.clickElementByXpath(dt);
        //await this.page.waitFor(500);

        await this.clickElementByXpath("//button[@data-stid='apply-date-picker']");

    }

    // scrape web part 2: from "clicking" on search button
    async scrapeFromSearch(inputData) {
        await this.page.waitFor(1000);
        await this.clickElementByText(this.translator.translate('Suchen'));
        await this.page.waitFor(10000);

        await this.page.waitForXPath("//input[@data-test-id='stopFilter_stops-0']");
        await this.clickElementByXpath("//input[@data-test-id='stopFilter_stops-0']");
        await this.page.waitFor(5000);

        var screenshot = await this.takeScreenShot(this.constructor.name);

        const depTimes = await this.getTextArrayFromXpath("//span[@data-test-id='departure-time']"); //18:20 Uhr–19:15 Uhr

        const arrTimes = await this.getTextArrayFromXpath("//span[@data-test-id='arrival-time']"); //18:20 Uhr–19:15 Uhr

        const prices = await this.getTextArrayFromXpath("//span[@data-test-id='listing-price-dollars']");//147 €Nur Hinflug, pro Reisendem
        const operatedBy = await this.getTextArrayFromXpath("//span[@data-test-id='airline-name']");

        var flightOffers = [];

        for (var i = 0; i < prices.length; i++) {
            var flightOffer = new FlightOffer();
            if (this.language == "de") {
                flightOffer.departureTime = depTimes[i].replace("Uhr", "").trim();
                flightOffer.arrivalTime = arrTimes[i].replace("Uhr", "").trim();
            }
            else if (this.language == "fr") {
                flightOffer.departureTime = depTimes[i].replace("h", ":").replace(" ", "").trim();
                flightOffer.arrivalTime = arrTimes[i].replace("h", ":").replace(" ", "").trim();
            }


            flightOffer.origin = inputData.origin;
            flightOffer.destination = inputData.destination;
            //logger.info("Found price " + prices[i]);
            flightOffer.price = prices[i].trim().replace('€', '').trim();
            flightOffer.airline = operatedBy[i].trim();
            flightOffer.screenshot = screenshot;
            flightOffers.push(flightOffer);
        }

        return flightOffers;
    }
}
