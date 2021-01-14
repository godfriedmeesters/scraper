import { WebScraper } from "../WebScraper";
import dateFormat from 'dateformat';
import { IScraper } from "../IScraper";
import { FlightOffer } from "../types";
var path = require('path');


export class AirFranceWebScraper extends WebScraper implements IScraper {

    constructor() { super(path.join(__dirname, "lang.json")); }

    async scrapeUntilSearch(inputData: any) {
        const depDate = new Date(inputData.departureDate);
        const origin = inputData.origin;
        const destination = inputData.destination;

        await this.page.goto(this.translator.translate("url"));

        await this.page.waitFor(2000);
        await this.clickElementByCss('.cookiebar-agree-button-agree')
        await this.page.waitFor(2000);

        const day = dateFormat(depDate, 'd');
        const shortMonthNames = this.language == "de" ? this.shortMonthNamesDe : this.shortMonthNamesFr;

        const yearMonth = shortMonthNames[depDate.getMonth()].toUpperCase() + " " + depDate.getFullYear();

        await this.clickElementByText(this.translator.translate("Hin- und Rückflug"));
        await this.clickElementByText(this.translator.translate("Nur Hinflug"));

        await this.clickElementByText(this.translator.translate("Abflugdatum"));

        await this.scrollCalendar(".mat-calendar-next-button", yearMonth)

        await this.clickElementByText(" " + day + " ");

        await this.page.waitForSelector('#station-list-0');

        await this.page.click('#station-list-0');
        await this.page.type('#station-list-0', origin, { delay: 100 });
        await this.tapEnter();
        await this.page.waitFor(1000);

        await this.page.click('#station-list-1');

        await this.page.type('#station-list-1', destination, { delay: 100 });
        await this.tapEnter();

    };

    async scrapeFromSearch(inputData) {
        await this.clickElementByText(this.translator.translate(" Flüge suchen "));

        await this.page.waitForNavigation();

        await this.page.waitFor(500);
        await this.page.waitForSelector('.bw-itinerary-row__header', { visible: true });
        var offerNodes = await this.page.$$(".bw-itinerary-row__header");

        var screenshot = await this.takeScreenShot(this.constructor.name);

        const flightOffers = await Promise.all(
            offerNodes.map(async (offerNode: any) => {
                var flightOffer = new FlightOffer();
                const time = await this.getTextFromElementByCss('bw-itinerary-times-info', offerNode);
                flightOffer.departureTime = time.split('-')[0].trim();
                flightOffer.arrivalTime = time.split('-')[1].trim();
                flightOffer.origin = await this.getTextFromElementByCss('.bw-itinerary-locations-info__node--extra-spacing',
                    offerNode);
                flightOffer.origin = flightOffer.origin.match(/\(([^)]+)\)/)[1];

                flightOffer.destination = await this.getTextFromElementByCss('.bw-itinerary-locations-info__node--extra-spacing+ .bw-itinerary-locations-info__node--dot',
                    offerNode);

                flightOffer.destination = flightOffer.destination.match(/\(([^)]+)\)/)[1];
                flightOffer.flightNumber = await this.getTextFromElementByCss('.bw-itinerary-operator-information__flight-number', offerNode);
                flightOffer.price = await this.getTextFromElementByCss('bw-price', offerNode);
                flightOffer.price = flightOffer.price.replace("EUR", "").trim();
                flightOffer.screenshot = screenshot;

                return flightOffer;
            })
        );

        return flightOffers;
    };
}

