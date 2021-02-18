import { AppScraper } from "../../AppScraper";
import { IScraper } from "../../IScraper";
import { FlightOffer } from "../../types";
const path = require('path');
import * as _ from 'underscore';

import { logger } from '../../logger';

export class OpodoAppScraper extends AppScraper implements IScraper {

  constructor() {
    super(JSON.stringify({
      "platformName": "Android",
      "app": "c:\\apk\\opodo.apk",
      "autoGrantPermissions": "true"
    }
    ));
  }

  async scrapeUntilSearch(data) {
    const departureDate = data.departureDate;
    const origin = data.origin;
    const destination = data.destination;

    const depDate = new Date(departureDate);

    const departureDay = depDate.getDate();
    const departureMonth = this.monaten[depDate.getMonth()];
    const departureYear = depDate.getFullYear();

    await this.clickLink("Fertig");

    await this.clickLink("Flüge");
    await this.clickLink("Nur Hinflug");

    await this.clickLink("Abflug");

    const flyingFrom = await this.getElementByResourceId("com.opodo.reisen:id/search_src_text")

    await flyingFrom.setValue(`${origin.substring(0, 4)}`);
    await this.clickElementByResource("com.opodo.reisen:id/txtCityName");

    await this.clickLink("Ziel");

    const flyingTo = await this.getElementByResourceId("com.opodo.reisen:id/search_src_text")
    await flyingTo.setValue(`${destination.substring(0, 4)}`);
    await this.clickElementByResource("com.opodo.reisen:id/txtCityName");

    await this.clickLink("Nur Direktflüge");

    await this.clickLink("Hinflugdatum");

    await this.scrollIntoView(departureMonth + ' ' + departureYear);

    await this.scrollDownUntilNotVisible(departureMonth + ' ' + departureYear);

    const departureDateChoice = await this.appiumClient.$(
      '//android.widget.TextView[@text="' +
      departureDay +
      '"]'
    );

    await departureDateChoice.click();

    await this.clickLink("WEITER");

  }

  // scrape Android app part 2: starting from  "clicking" the search button
  async scrapeFromSearch(inputData) {

    await this.clickLink("FLÜGE SUCHEN");


    var rect = await this.appiumClient.getWindowRect();

    await this.sleep(1000);

    var rectX = rect.width / 3;
    var rectY = rect.height / 1.1;

    var flightOffersOnScreen = []; //flight offers currently on the screen
    var flightOffers = [];

    var initPrices = await this.getElementsByResourceId('com.opodo.reisen:id/flights_price');

    var lastPriceOffScreenText = await initPrices[0].getText();

    var bounds = await initPrices[0].getAttribute("bounds");
    var lastPriceOffScreenY = parseInt(bounds.match(/\d+/g)[1]);


    while (true) {
      console.log("last price offscreen = " + lastPriceOffScreenText)
      var oldFlightOffersOnScreen = flightOffersOnScreen.slice();
      flightOffersOnScreen = [];
      var prices = await this.getElementsByResourceId('com.opodo.reisen:id/flights_price');
      var departureTimes = await this.getElementsByResourceId('com.opodo.reisen:id/departure_hour');
      var arrivalTimes = await this.getElementsByResourceId('com.opodo.reisen:id/arrival_hour');
      var originsDestinations = await this.getElementsByResourceId('com.opodo.reisen:id/departure_and_arrival');
      var airLines = await this.getElementsByResourceId('com.opodo.reisen:id/airline_name');

      var screenshot = await this.takeScreenShot("OpodoAppScraper");


      for (var i = 0; i < departureTimes.length && i < arrivalTimes.length && i < originsDestinations.length; i++) {
        var flightOffer = new FlightOffer();

        var bounds = await departureTimes[i].getAttribute("bounds");
        const departureY = parseInt(bounds.match(/\d+/g)[1]);

        if (prices.length == 0) {
          flightOffer.price = lastPriceOffScreenText;
        }
        else if (prices.length == 1) {
          bounds = await prices[0].getAttribute("bounds");
          const priceY = parseInt(bounds.match(/\d+/g)[1]);
          if (departureY < priceY) {
            flightOffer.price = lastPriceOffScreenText;
          }
          else {
            flightOffer.price = await prices[0].getText();
          }
        }
        else if (prices.length > 1) {
          if (departureY > lastPriceOffScreenY) {
            flightOffer.price = lastPriceOffScreenText;
          }

          for (var j = 0; j < prices.length; j++) {
            bounds = await prices[j].getAttribute("bounds");
            const priceY = parseInt(bounds.match(/\d+/g)[1]);

            if (departureY > priceY) {
              flightOffer.price = await prices[j].getText();
            }
          }
        }

        const deptT = await departureTimes[i].getText();
        flightOffer.departureTime = deptT;
        const arrT = await arrivalTimes[i].getText();
        flightOffer.arrivalTime = arrT;
        const txt = await originsDestinations[i].getText();
        flightOffer.origin = txt.split("-")[0].trim();

        flightOffer.destination = txt.split("-")[1].trim();

        flightOffersOnScreen.push(flightOffer);

        /////////////////////////////////////////////////:
        const screenShotFlightOffer = { ...flightOffer };
        screenShotFlightOffer.screenshot = screenshot;

        if (_.findWhere(flightOffers, screenShotFlightOffer) == null) {

          flightOffers.push(screenShotFlightOffer);

          console.log(screenShotFlightOffer);
          logger.info("adding new flight offer");
        }
        else {
          logger.info("skipping flight offer");
        }
      }

      if (prices.length > 0) {
        var bounds = await prices[prices.length - 1].getAttribute("bounds");
        const newLastPriceOffScreenY = parseInt(bounds.match(/\d+/g)[1]);
        lastPriceOffScreenY = newLastPriceOffScreenY;
        lastPriceOffScreenText = await prices[prices.length - 1].getText();
      }

      if (_.isEqual(oldFlightOffersOnScreen, flightOffersOnScreen)) {
        break;
      }


      await this.appiumClient.touchAction([
        { action: 'press', x: rectX, y: rectY },
        { action: 'wait', ms: 500 },
        { action: 'moveTo', x: rectX, y: rectY * 0.4 },
        'release',
      ]);

    }

    return flightOffers;

    /**************************** */

  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }


}