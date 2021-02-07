import { WebScraper } from "../WebScraper";
import dateFormat from 'dateformat';
import { IScraper } from "../IScraper";
import { FlightOffer } from "../types";
import { logger } from "../logger";
var convertTime = require('convert-time');
const de = require('date-and-time/locale/de');
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
        await this.page.waitFor(1000);

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
        const [zoeken] = await this.page.$x(`//span[contains(., '${this.translator.translate("Suchen")}')]`);

        if (zoeken) {
            await this.page.waitFor(1000);
            await zoeken.click();
        }

        await this.page.waitForNavigation();

        const types = await this.getElementsAttributeByXpath("//button[@class='m-ibe-flighttariff__select']", "aria-label");

        const prices = await this.getElementsTextByCss('.m-ibe-flighttariff__fare-price .a-price');

        const flightTimes = await this.getElementsTextByCss('.a-headline.a-headline--h4.t-spacing--0');
        const locations = await this.getElementsTextByCss('.m-ibe-flighttable__station');

        var fNumber = await this.getElementAttributeByCss(".m-ibe-flighttable__cta-info", "aria-label");
        fNumber = fNumber.replace(/{(.*?)}/, '').trim();

        var screenshotPath = await this.takeScreenShot(this.constructor.name);

        const url = this.page.url();
        var flightOffers = [];
        for (var i = 0; i < prices.length; i++) {
            var flightOffer = new FlightOffer();
            flightOffer.departureTime = convertTime(flightTimes[0]);
            flightOffer.arrivalTime = convertTime(flightTimes[1]);
            flightOffer.flightNumber = fNumber;
            flightOffer.origin = locations[0].match(/\(([^)]+)\)/)[1];
            flightOffer.destination = locations[1].match(/\(([^)]+)\)/)[1];;
            flightOffer.price = prices[i].trim().replace('€', '');;
            flightOffer.type = types[i].split(' ')[0];
            flightOffer.screenshot = screenshotPath;
            flightOffer.url = url;
            flightOffers.push(flightOffer);
        }

        return flightOffers;
    }
}