/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-22 22:33:06
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-06-05 12:14:33
 * @ Description:
 */

import { WebScraper } from "../../WebScraper";
import { IScraper } from "../../IScraper";
import { FlightOffer } from "../../types";

import { logger } from '../../logger';
var path = require('path');

export class OpodoWebScraper extends WebScraper implements IScraper {

    constructor() { super(path.join(__dirname, "lang.json")); }

    async scrapeUntilSearch(inputData: any) {
        // const departureDate = new Date(inputData.departureDate);
        // const origin = inputData.origin;
        // const destination = inputData.destination;

        // await this.page.goto(this.translator.translate("url"));
        // await this.page.waitFor(5000);
        // await this.clickOptionalElementByCss('#didomi-notice-agree-button');

        // await this.page.waitFor(5000);
        // await this.clickElementByXpath(`//label[@for='tripTypeSwitcher_oneWayTrip']`);
        // await this.page.waitFor(2000);

        // await this.clickElementByXpath("//label[@for='direct-flight-switcher']");

        // await this.page.waitFor(1000);
        // const from = await this.getElementByXpath(`//input[contains(@placeholder,"${this.translator.translate("Von?")}")]`);

        // await this.page.waitFor(500);
        // await from.type(origin, { delay: 50 });
        // await this.page.waitFor(3000);
        // await this.tapEnter();

        // await this.page.waitFor(3000);

        // const to = await this.getElementByXpath(`//input[contains(@placeholder,"${this.translator.translate("Nach?")}")]`);
        // await to.type(destination, { delay: 50 });
        // await this.page.waitFor(3000)
        // await this.tapEnter();
        // await this.page.waitFor(3000);

        // let isStrMonthFound = false;

        // const dp = await this.getElementByXpath(`//input[@placeholder='${this.translator.translate("Hinflug")}']`);

        // await this.page.waitFor(3000);

        // const shortMonthNames = this.language == "de" ? this.shortMonthNamesDe : this.shortMonthNamesFr;

        // const strLookForMonth = this.language == "fr" ? shortMonthNames[departureDate.getMonth()].replace(".", "").toLowerCase() :
        //     shortMonthNames[departureDate.getMonth()].replace(".", "");

        // logger.info("Scrolling to the right month " + strLookForMonth + " ... ");
        // while (!isStrMonthFound) {
        //     const strMonths = await this.getElementsTextByCss(".odf-calendar-title");

        //     logger.info(strMonths);
        //     for (var strMonth of strMonths) {
        //         if (strMonth.includes(strLookForMonth)) {
        //             isStrMonthFound = true;
        //             break;
        //         }
        //     }

        //     if (!isStrMonthFound) {
        //         logger.info(`looking for ${strLookForMonth}, clicking next month`);
        //         await this.clickElementByXpath("//span[@glyph='arrow-right']");

        //         await this.page.waitFor(1000);
        //     }
        // }
        // logger.info("Clicking the day...");
        // await this.clickElementByXpath(`//div[@class='odf-calendar']//div[@class = 'odf-calendar-title' and contains(text(), '${strLookForMonth}')]/following-sibling::div//div[contains(@class,'odf-calendar-day') and text() = '${departureDate.getDate()}']`);

    }

    async scrapeFromSearch(inputData) {
        const departureDate = inputData.departureDate;
        const origin = inputData.origin;
        const destination = inputData.destination;


        var flightOffers = [];
        await this.page.setRequestInterception(true);

        this.page.on('request', async (request) => {
            request.continue();
        });

        var screenShotPath = "";
        this.page.on('response', async response => {
            if (response.url().includes("graphql")) {

                if (response.status() == 200) {

                    const jsonText = await response.text();
                    if (jsonText.includes("itineraries")) {
                        this.logInfo("graphql found");
                        const json = JSON.parse(jsonText);
                        screenShotPath = await this.takeJsonScreenShot ("OpodoWebScraper", JSON.stringify(json));

                        flightOffers = this.getFlightsGraphSQL(json);
                    }
                }
            }
            else if (response.url().includes("data")) {
                if (response.status() == 200) {
                    const jsonText = await response.text();
                    if (jsonText.includes("segItems")) {
                        this.logInfo("data found");

                        const json = JSON.parse(jsonText);
                        screenShotPath = await this.takeJsonScreenShot ("OpodoWebScraper", JSON.stringify(json));

                        flightOffers = this.getFlightsData(json);
                    }
                }
            }

        });

        const url = `${this.translator.translate("url")}/travel/#results/type=O;from=${origin};to=${destination};dep=${departureDate};buyPath=FLIGHTS_HOME_SEARCH_FORM;direct=true;internalSearch=true`

        await this.page.goto(url);

        await this.page.waitFor(10000);
        await this.clickOptionalElementByCss('#didomi-notice-agree-button');

        await this.clickOptionalElementByText("UNDERSTOOD");
        await this.page.waitFor(5000);



        const foundUrl = await this.page.url();

        for (const flightOffer of flightOffers) {
            flightOffer.url = foundUrl;
            flightOffer.screenshot = screenShotPath;
        }

        return flightOffers;
    }


    getFlightsData(json) {
        const flightOffers = [];

        for (const item of json.items) {
            for (const segItem of item.itineraryGroupsList[0].segItems) {
                const flightOffer = new FlightOffer();

                flightOffer.price = item.priceWithoutDiscounts.replace(/(<([^>]+)>)/gi, "").replace("&euro;", '').trim();
                flightOffer.origin = segItem.departureInfo.iata;
                flightOffer.destination = segItem.arrivalInfo.iata;
                flightOffer.departureTime = segItem.departureInfo.time;
                flightOffer.arrivalTime = segItem.arrivalInfo.time;
                flightOffer.airline = item.itineraryGroupsList[0].carrierName;

                if (item.itineraryGroupsList.length == 1) {
                    flightOffers.push(flightOffer);
                }
            }
        }

        return flightOffers;
    }

    getFlightsGraphSQL(json) {

        const flightOffers = [];

        for (const itin of json.data.search.itineraries) {
            const flightOffer = new FlightOffer();
            flightOffer.price = itin.fees[0].price.amount;

            const section = itin.legs[0].segments[0].sections[0];
        //console.log(JSON.stringify(section));
            const depDate = new Date(section.departureDate.split('+')[0]);

            flightOffer.departureTime = (depDate.getHours() < 10 ? '0' : '') + depDate.getHours()
                + ":"
                + (depDate.getMinutes() < 10 ? '0' : '') + depDate.getMinutes()

            const arrDate = new Date(section.arrivalDate.split('+')[0]);
            flightOffer.arrivalTime = (arrDate.getHours() < 10 ? '0' : '') + arrDate.getHours()
                + ":"
                + (arrDate.getMinutes() < 10 ? '0' : '') + arrDate.getMinutes()

        //    flightOffer.arrivalTime = arrDate.getHours() + ":" + arrDate.getMinutes();;
            flightOffer.origin = section.departure.iata;
            flightOffer.destination = section.destination.iata;
            flightOffer.airline = section.carrier.name;


            if (itin.legs[0].segments[0].sections.length == 1) {
                console.log(JSON.stringify(flightOffer));
                flightOffers.push(flightOffer);
            }
        }

        return flightOffers;
    }
}

