import { AppScraper } from "../AppScraper";
import { IScraper } from "../IScraper";
import { FlightOffer, OfferList } from "../types";
require('dotenv').config();

import * as _ from 'underscore';

var convertTime = require('convert-time');

var path = require('path');
import date from 'date-and-time';
const de = require('date-and-time/locale/de');
import { logger } from "../logger";


export class ExpediaAppScraper extends AppScraper implements IScraper {

  constructor() {
    const apkPath = "c:\\apk\\Expedia_v20.49.0_apkpure.com.apk";
    date.locale("de");
    super(JSON.stringify({
      "platformName": "Android",
      "buildToolsVersion": "28.0.3",
      "deviceName": "emulator-5554",
      "app":  apkPath,
      "autoGrantPermissions": "true",
      "language": "de",
      "locale": "DE",
    }
    ));
  }

  async scrapeUntilSearch(inputData) {
    const departureDate = inputData.departureDate;
    const origin = inputData.origin;
    const destination = inputData.destination;

    const depDate = new Date(departureDate);

    const departureDay = depDate.getDate();

    try {
      await this.clickOptionalLinkByResourceId("com.expedia.bookings:id/button_next");
      await this.clickOptionalLinkByResourceId("com.expedia.bookings:id/button_next");

      await this.clickOptionalLinkByResourceId("com.expedia.bookings:id/button_final");
      await this.clickOptionalLinkByResourceId("com.expedia.bookings:id/uds_toolbar_navigation_icon");
    }
    catch (ex) { }


    try {
      await this.clickOptionalLink("Akzeptieren");
    } catch (ex) { }

    await this.sleep(2000);
    await this.clickElementByXpath('//android.widget.TextView[@content-desc="Flüge Schaltfläche"]');


    await this.clickLink("Nur Hinflug");

    await this.clickLink("Abflugort");

    const flyingFrom =  await this.getElementByResourceId("com.expedia.bookings:id/search_src_text");

    await flyingFrom.setValue(origin);
    await this.clickElementByResource("com.expedia.bookings:id/title_textview");

    //await this.clickLink("Zielort");

    const flyingTo = await this.getElementByResourceId("com.expedia.bookings:id/search_src_text");

    await flyingTo.setValue(destination);

    await this.clickElementByResource("com.expedia.bookings:id/title_textview");

    await this.appiumClient.setImplicitTimeout(500);
    const strDateMonth = date.format(depDate, "MMMM YYYY");
    logger.info("Looking for " + strDateMonth);
    let elem = await this.getElement(strDateMonth);

    while (elem.elementId == null) {
      await this.appClickElementByResource("com.expedia.bookings:id/next_month");
      elem = await this.getElement(strDateMonth);
    }

    this.appiumClient.setImplicitTimeout(parseInt(process.env.DEFAULT_APPIUM_TIMEOUT));
    await this.clickElementByXpath("//android.view.View[contains(@content-desc,'" + departureDay + "' )]");
    await this.clickLink("FERTIG");
  }

  // scrape Android app part 2: starting from  "clicking" the search button
  async scrapeFromSearch(inputData) {
    await this.clickLink("Suchen");
    await this.sleep(5000);

    await this.clickLink("Direktflug");
    await this.sleep(2000);

    // var screenshot = await this.takeScreenShot();

    var rect = await this.appiumClient.getWindowRect();

    await this.sleep(1000);

    var rectX = rect.width / 2;
    var rectY = rect.height / 1.1;

    var flightOffersOnScreen = []; //flight offers currently on the screen
    var flightOffers = [];

    while (true) {
      var screenshot = await this.takeScreenShot(this.constructor.name);
      var oldFlightOffersOnScreen = flightOffersOnScreen.slice();
      flightOffersOnScreen = [];
      var prices = await this.getElementsByResourceId('com.expedia.bookings:id/price_in_variant_text_view');
      var timeLines = await this.getElementsByResourceId('com.expedia.bookings:id/flight_time_detail_text_view');
      var airLines = await this.getElementsByResourceId('com.expedia.bookings:id/airline_text_view');

      logger.info("Found " + prices.length + " lines ");

      for (var i = 0; i < prices.length && i < airLines.length && i < timeLines.length; i++) {
        var flightOffer = new FlightOffer();

        const pr = await prices[i].getText();
        flightOffer.price = pr.replace("€", "").trim();

        const tl = await timeLines[i].getText();
        flightOffer.departureTime = tl.split("–")[0];

        flightOffer.arrivalTime = tl.split("–")[1];

        flightOffer.origin = inputData.origin;
        flightOffer.destination = inputData.destination;

        const al = await airLines[i];

        flightOffer.airline = await al.getText();


        flightOffersOnScreen.push(flightOffer);

        const screenShotFlightOffer = { ...flightOffer };
        screenShotFlightOffer.screenshot = screenshot;

        if (_.findWhere(flightOffers, screenShotFlightOffer) == null) {
          flightOffers.push(screenShotFlightOffer);
          logger.info("adding new flight offer");
        }
        else {
          logger.info("skipping flight offer");
        }
      }

      if (_.isEqual(oldFlightOffersOnScreen, flightOffersOnScreen)) {
        break;
      }

      await this.appiumClient.touchAction([
        { action: 'press', x: rectX, y: rectY },
        { action: 'wait', ms: 500 },
        { action: 'moveTo', x: rectX, y: rectY * 0.1 },
        'release',
      ]);

      rect = await this.appiumClient.getWindowRect();
    }

    return flightOffers;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}