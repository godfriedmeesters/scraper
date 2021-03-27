import { WebScraper } from "../../WebScraper";
import dateFormat from 'dateformat';
import { IScraper } from "../../IScraper";
import { FlightOffer } from "../../types";
import { logger } from "../../logger";
var path = require('path');

export class EuroWingsWebScraper extends WebScraper implements IScraper {

    constructor() {
        super(path.join(__dirname, "lang.json"));
    }

    // scrape web part 1: until "clicking" the search button
    async scrapeUntilSearch(inputData: any) {
        const departureDate = inputData.departureDate;
        const origin = inputData.origin;
        const destination = inputData.destination;

        logger.info("Going to url " + this.translator.translate("url"));

        await this.page.goto(this.translator.translate("url"));

        await this.clickOptionalElementByCss(".cookie-consent--cta-accept");

        await this.page.waitFor(2000);

        await this.clickOptionalElementByCss(".cv-myew-flyout__close-btn");

        await this.page.$eval('.flightmonitor', (el) => el.scrollIntoView());

        await this.page.waitFor(5000);

        await this.clickElementByCss(".o-compact-search__bar-item--station-select-origin");

        await this.page.waitFor(2000);

        const originElement = await this.getElementByXpath(`//input[contains(@aria-label,"${this.translator.translate("Abflughafen")}")]`);
        await originElement.focus();

        await originElement.type(origin);

        await this.page.waitFor(3000);
        await this.tapEnter();
        await this.page.waitFor(5000);

        const destinationElement = await this.getElementByXpath(`//input[contains(@aria-label,"${this.translator.translate("Zielflughafen")}")]`);
        await destinationElement.focus();

        await destinationElement.type(destination);

        await this.page.waitFor(3000);
        await this.tapEnter();


        await this.page.waitFor(1000);
        const dateElement = await this.getElementByXpath(`//input[@aria-label="${this.translator.translate("Hinflug")}"]`);
        await dateElement.type(dateFormat(new Date(departureDate), this.language == "de" ? "dd.mm.yy" : "dd/mm/yy"));



        await this.page.waitFor(3000);
        await this.tapEnter();

        await this.page.waitFor(1000);
    }

    async scrapeFromSearch(inputData) {

        var flightOffers = [];
        await this.page.setRequestInterception(true);

        this.page.on('request', async (request) => {
            request.continue();
        });

        this.page.on('response', async response => {
            if (response.url().includes("select.booking.json")) {

                if (response.status() == 200) {

                    const text = await response.text();

                    const json = JSON.parse(text);

                    flightOffers = this.getFlightsData(json);

                }
            }
        });

        const [zoeken] = await this.page.$x(`//span[contains(., '${this.translator.translate("Suchen")}')]`);

        if (zoeken) {
            await this.page.waitFor(1000);
            await zoeken.click();
        }

        await this.page.waitFor(5000);

        const url = await this.page.url();

        var screenshotPath = await this.takeScreenShot("EuroWingsWebScraper");

        for (const flightOffer of flightOffers) {
            flightOffer.url = url;
            flightOffer.screenshot = screenshotPath;
        }

        return flightOffers;
    }

    getFlightsData(json) {
        const flightOffers = [];


        if ("_updates" in json._payload) {
            const origin = json._payload._updates[0]._resultData.flights[0].route.origin;
            const destination = json._payload._updates[0]._resultData.flights[0].route.destination;

            const price = json._payload._updates[0]._resultData.flights[0].schedules[0].journeys[0].fares[0].farePrices[0].price.value;

            const depTime = json._payload._updates[0]._resultData.flights[0].schedules[0].journeys[0].segments[0].departure.displayTime;
            const arrTime = json._payload._updates[0]._resultData.flights[0].schedules[0].journeys[0].segments[0].arrival.displayTime;


            const flightOffer = new FlightOffer();

            flightOffer.price = price;
            flightOffer.origin = origin;
            flightOffer.destination = destination;
            flightOffer.departureTime = depTime;
            flightOffer.arrivalTime = arrTime;


            flightOffers.push(flightOffer);
            return flightOffers;
        }
    }
}