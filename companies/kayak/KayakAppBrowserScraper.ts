import { IScraper } from "../../IScraper";
import { FlightOffer } from "../../types";
import * as _ from 'underscore';
import { logger } from "../../logger";
import { AppScraper } from "../../AppScraper";

export class KayakAppBrowserScraper extends AppScraper implements IScraper {

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

        await this.appiumClient.url(`https://www.kayak.de/flights/${origin}-${destination}/${departureDate}?sort=bestflight_a`);

        var cookiesAccepted = false;
        try {
            cookiesAccepted = true;
            const cookieOK = await this.appiumClient.$(".GDPRCookieConsent__button");
            await cookieOK.click();
            cookiesAccepted = true;
        } catch (ex) { }


        if (!cookiesAccepted) {
            try {
                const cookieOK2 = await this.appiumClient.$("#onetrust-accept-btn-handler");
                await cookieOK2.click();
            }
            catch (ex) { }
        }

        var filtered = false;
        try {
            const filterButton = await this.appiumClient.$('//button[span[text()="Filter"]]');
            await filterButton.click();


            const oneStop = await this.appiumClient.$('//span[text()="Nonstop"]');
            await oneStop.click();

            const doFilter = await this.appiumClient.$('button.FilterMenu__viewResultButton');
            await doFilter.click();
            filtered = true;
        } catch (ex) { }


        if (!filtered) {
            try {
                const filterButton = await this.appiumClient.$('#r9-checkboxGroup-1 > div > div:nth-child(2)');
                await filterButton.click();


                const oneStop = await this.appiumClient.$('//button/div/span[contains(text(),"Nonstop")]');
                await oneStop.click();

                const doFilter = await this.appiumClient.$('//button[contains(text(), "Fertig") and @ng-click ]');
                await doFilter.click();
            } catch (ex) { }
        }


        const depTimes = await this.appiumClient.$$('div.ResultLeg__depBlock > div.ResultLeg__time');
        const arrTimes = await this.appiumClient.$$(' div.ResultLeg__dstBlock > div.ResultLeg__time');

        const prices = await this.appiumClient.$$('div.FResultItem__mainRight > r9-text-resize > ng-transclude');

        const depAirports = await this.appiumClient.$$('div.ResultLeg__depBlock > div.ResultLeg__airport');

        const arrAirports = await this.appiumClient.$$(' div.ResultLeg__dstBlock > div.ResultLeg__airport');

        const airlines = await this.appiumClient.$$('.FResultItem__airlines > span:first-of-type');

        logger.info("found " + prices.length + " offers");
        logger.info("found " + airlines.length + " airlines");

        const flightOffers = [];
        for (var i = 0; i < prices.length; i++) {
            const offer = new FlightOffer();
            offer.price = await prices[i].getText();

            offer.departureTime = await depTimes[i].getText();
            offer.arrivalTime = await arrTimes[i].getText();

            offer.origin = await depAirports[i].getText();
            offer.destination = await arrAirports[i].getText();
            offer.airline = await airlines[i].getText();
            offer.airline= offer.airline.replace('-', '').trim();

            flightOffers.push(offer);

        }

        return flightOffers;

    }


}