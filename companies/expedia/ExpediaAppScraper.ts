import { AppScraper } from "../../AppScraper";
import { IScraper } from "../../IScraper";
import { FlightOffer} from "../../types";
require('dotenv').config();

import * as _ from 'underscore';

import date from 'date-and-time';
const de = require('date-and-time/locale/de');
import { logger } from "../../logger";


export class ExpediaAppScraper extends AppScraper implements IScraper {

  constructor() {

    date.locale("de");
    super(JSON.stringify({
      "adbExecTimeout": "100000",
      "platformName": "Android",
      "app":  "c:\\apk\\Expedia_19.32.0_apkmirror.com.apk",
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

    await this.clickElementByXpath(`(//android.view.View[contains(@content-desc,'${departureDay}.' )])[1]`);
    await this.clickLink("FERTIG");
  }

  // scrape Android app part 2: starting from  "clicking" the search button
  async scrapeFromSearch(inputData) {
    await this.clickLink("Suchen");
    await this.sleep(5000);

    await this.clickElementByXpath('//android.widget.FrameLayout[@content-desc="Schaltfläche Sortieren und filtern"]');
    await this.clickElementByXpath('//android.view.ViewGroup[contains(@content-desc,"Direktflug")]');
    await this.clickLink("Fertig");
    await this.sleep(2000);

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
      var prices = await this.getElementsByResourceId('com.expedia.bookings:id/price');
      var timeLines = await this.getElementsByResourceId('com.expedia.bookings:id/flight_time');
      var airLines = await this.getElementsByResourceId('com.expedia.bookings:id/airline_name');

      logger.info("Found " + prices.length + " lines ");

      for (var i = 0; i < prices.length && i < airLines.length && i < timeLines.length; i++) {
        var flightOffer = new FlightOffer();

        const pr = await prices[i].getText();
        flightOffer.price = pr.replace("€", "").trim();

        const tl = await timeLines[i].getText();
        flightOffer.departureTime = tl.split("–")[0].replace("Uhr","").trim();

        flightOffer.arrivalTime = tl.split("–")[1].replace("Uhr","").trim();

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