/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2021-03-17 12:42:16
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-04-19 21:00:39
 * @ Description:
 */

import { IScraper } from "../../IScraper";
import { FlightOffer } from "../../types";
import * as _ from 'underscore';
import { AppScraper } from "../../AppScraper";
import { logger } from "../../logger";

export class KayakMobileBrowserScraper extends AppScraper implements IScraper {

    constructor() {
        super(JSON.stringify({
            platformName: 'Android',
            "autoGrantPermissions": "true"
            , automationName: 'UIAutomator2'
            , browserName: 'Chrome'
        }
        ));
    }

    async scrapeUntilSearch(inputData) {

    }


    async scrapeFromSearch(inputData) {
        const departureDate = inputData.departureDate;
        const origin = inputData.origin;
        const destination = inputData.destination;

        await this.appiumClient.url(`https://www.kayak.de/flights/${origin}-${destination}/${departureDate}?fs=stops=0&sort=bestflight_a`);


        // accept cookies v1
        var cookiesAccepted = true;
        try {
            const cookieOK = await this.appiumClient.$(".GDPRCookieConsent__button");
            await cookieOK.click();

        } catch (ex) { cookiesAccepted = false }


        //accept cookies v2
        if (!cookiesAccepted) {
            try {
                const cookieOK2 = await this.appiumClient.$("#onetrust-accept-btn-handler");
                await cookieOK2.click();
            }
            catch (ex) { }
        }

        await this.sleep(5000);


        logger.info("Getting offers sorted by best");
        const flightOffersSortedByBest = await this.extractOffers();

        logger.info("Getting offers sorted by cheapest");
        await this.appiumClient.url(`https://www.kayak.de/flights/${origin}-${destination}/${departureDate}?fs=stops=-1&sort=price_a`);

        const flightOffersSortedByCheapest = await this.extractOffers();
        return { 'sortedByBest': flightOffersSortedByBest, 'sortedByCheapest': flightOffersSortedByCheapest };

    }

    async extractOffers() {
        logger.info("Extracting offers...");
        const depTimes = await this.appiumClient.$$('div.ResultLeg__depBlock > div.ResultLeg__time');
        const arrTimes = await this.appiumClient.$$(' div.ResultLeg__dstBlock > div.ResultLeg__time');

        const prices = await this.appiumClient.$$('div.FResultItem__mainRight > r9-text-resize > ng-transclude');

        const depAirports = await this.appiumClient.$$('div.ResultLeg__depBlock > div.ResultLeg__airport');

        const arrAirports = await this.appiumClient.$$(' div.ResultLeg__dstBlock > div.ResultLeg__airport');

        const airlines = await this.appiumClient.$$('.FResultItem__airlines > span:first-of-type');

        logger.info("found " + prices.length + " offers");
        logger.info("found " + airlines.length + " airlines");
        var screenshot = await this.takeScreenShot(this.constructor.name);
        const offers = [];


        for (var i = 0; i < prices.length; i++) {
            const offer = new FlightOffer();
            offer.price = await prices[i].getText();
            offer.price = offer.price.trim();

            offer.departureTime = await depTimes[i].getText();
            offer.arrivalTime = await arrTimes[i].getText();

            offer.origin = await depAirports[i].getText();
            offer.destination = await arrAirports[i].getText();
            offer.airline = await airlines[i].getText();
            offer.airline = offer.airline.replace('-', '').trim();
            offer.screenshot = screenshot;

            offers.push(offer);
        }


        return offers;

    }


}