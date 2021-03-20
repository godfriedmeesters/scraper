/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-30 21:04:13
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-03-20 13:13:59
 * @ Description:
 */


import { WebScraper } from "../../WebScraper";
import { IScraper } from "../../IScraper";
import { HotelOffer } from "../../types";
import { logger } from '../../logger';
var path = require('path');
const de = require('date-and-time/locale/de');
const fr = require('date-and-time/locale/fr');

import date from 'date-and-time';

export class BookingWebScraper extends WebScraper implements IScraper {

    constructor() { super(path.join(__dirname, "lang.json")); }

    async scrapeUntilSearch(inputData: any) {
        date.locale(this.language);
        const departureDate = inputData.checkinDate;

        const destination = inputData.location;

        logger.info("Navigating to " + this.translator.translate("url"));
        await this.page.goto(this.translator.translate("url"));

        await this.page.waitFor(2000);

        await this.clickOptionalElementByCss("#onetrust-accept-btn-handler");

        const txtOrigin = await this.getElementByCss(".sb-destination__input");

        await txtOrigin.type(destination, { delay: 50 });

        await this.clickElementByCss(".xp__dates.xp__group");

        const d = new Date(departureDate);

        const strDate = date.format(d, "D MMMM YYYY");

        logger.info("looking for date " + strDate);



        const xp = "//span[@aria-label='" + (this.language == "fr" ? strDate.toLowerCase() : strDate) + "']";

        var dateInPage: boolean = await this.isXpathInPage(xp);

        while (!dateInPage) {
            logger.info("Navigating to next month in calendar");
            await this.clickElementByCss('.bui-calendar__control--next');

            dateInPage = await this.isXpathInPage(xp);
        }

        await this.clickElementByXpath("//span[@aria-label='" + strDate + "']");
        d.setDate(d.getDate() + 1);
        const strNextDate = date.format(d, "D MMMM YYYY");

        await this.clickElementByXpath("//span[@aria-label='" + strNextDate + "']");

    }

    // scrape web part 2: from "clicking" on search button
    async scrapeFromSearch(inputData) {

        await this.page.waitFor(5000);
        await this.clickElementByCss(".sb-searchbox__button");

        await this.page.waitFor(15000);

        const offersSortedByBest = await this.extractOffers(inputData);

        await this.clickElementByXpath('//a[@data-type="price"]');

        const offersSortedByCheapest = await this.extractOffers(inputData);

        return { 'sortedByBest': offersSortedByBest, 'sortedByCheapest': offersSortedByCheapest };

    }

    async extractOffers(inputData){
        let isNextDisabled = false;
        let isNextAvailable = true;

        let hotelOffers = [];

        while (!isNextDisabled && isNextAvailable) {
            var screenshotPath = await this.takeScreenShot(this.constructor.name);
            const hotelNames = await this.getElementsTextByCss(".sr-hotel__name");
            const hotelPrices = await this.getElementsTextByCss(".bui-price-display__value");
            // const locationNames = await this.getElementsTextByCss("div.sr_card_address_line a.bui-link");

            for (var i = 0; i < hotelPrices.length; i++) {
                var hotelOffer = new HotelOffer();
                hotelOffer.screenshot = screenshotPath;
                // hotelOffer.searchLocation = locationNames[i].trim().split('\n')[0].trim();
                hotelOffer.checkinDate = inputData.checkinDate;
                hotelOffer.price = hotelPrices[i].replace("€", "").trim();
                hotelOffer.hotelName = hotelNames[i].trim();
                hotelOffers.push(hotelOffer);
            }


            isNextDisabled = await this.isCssInpage(".bui-pagination__item.bui-pagination__next-arrow.bui-pagination__item--disabled");
            if (isNextDisabled) {
                logger.info("No more next button");
                break;
            }
            else {
                const isNextAvailable = await this.isCssInpage(".bui-pagination__item.bui-pagination__next-arrow");

                logger.info("Next button available");

                if (isNextAvailable) {
                    //await this.page.waitForNavigation();
                    await this.clickElementByCss(".bui-pagination__item.bui-pagination__next-arrow");
                    await this.page.waitFor(2000);
                }
                else
                    break;

            }
            logger.info("Going to next page");

        }

        return hotelOffers;


    }



}

