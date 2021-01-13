import { WebScraper } from "../WebScraper";
const de = require('date-and-time/locale/de');
import { IScraper } from "../IScraper";
import { FlightOffer } from "../types";
import { logger } from "../logger";
const fs = require('fs');
var path = require('path');

export class ExpediaWebScraper extends WebScraper implements IScraper {

    constructor() { super( path.join(__dirname, "lang.json")); }

    async scrapeUntilSearch(inputData: any) {

        const departureDate = inputData.departureDate;
        const depDate = new Date(departureDate);
        const origin = inputData.origin;
        const destination = inputData.destination;
        await this.page.goto(this.translator.translate("url"));
        await this.page.waitFor(3000);

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


        //logger.info("Looking for date " + dt);

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

        await this.page.waitForXPath("//input[@data-test-id='stopFilter_stops-0' or @data-test-id='stops-0' ]");
        await this.clickElementByXpath("//input[@data-test-id='stopFilter_stops-0' or @data-test-id='stops-0' ]");


        await this.page.waitFor(5000);

        var screenshot = await this.takeScreenShot(this.constructor.name);

        const depTimes = await this.getTextArrayFromXpath("//span[@data-test-id='departure-time']"); //18:20 Uhr–19:15 Uhr


        //const prices = await this.getTextArrayFromXpath("//span[@data-test-id='listing-price-dollars']");//147 €Nur Hinflug, pro Reisendem
        const prices = await this.getElementsTextByCss("span.uitk-lockup-price");
        const operatedBy = await this.getTextArrayFromXpath("//div[@data-test-id='flight-operated']");

        var flightOffers = [];

        for (var i = 0; i < prices.length; i++) {
            var flightOffer = new FlightOffer();
            if (this.language == "de") {
                flightOffer.departureTime = depTimes[i].split("–")[0].replace("Uhr", "").trim();
                flightOffer.arrivalTime = depTimes[i].split("–")[1].replace("Uhr", "").trim();
            }
            else if (this.language == "fr") {
                flightOffer.departureTime = depTimes[i].split("–")[0].replace("h", ":").replace(" ", "").trim();
                flightOffer.arrivalTime = depTimes[i].split("–")[1].replace("h", ":").replace(" ", "").trim();
            }


            flightOffer.origin = inputData.origin;
            flightOffer.destination = inputData.destination;
            flightOffer.price = prices[i].trim().replace('€', '').trim();
            flightOffer.airline = operatedBy[i].trim();
            flightOffer.screenshot = screenshot;
            flightOffers.push(flightOffer);
        }

        return flightOffers;
    }
}

