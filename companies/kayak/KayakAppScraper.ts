import { AppScraper } from "../../AppScraper";
import { IScraper } from "../../IScraper";
import { FlightOffer } from "../../types";
import * as _ from 'underscore';
import { logger } from "../../logger";

var convertTime = require('convert-time');
//TODO: german
export class KayakAppScraper extends AppScraper implements IScraper {

  constructor() {
    super(JSON.stringify({
      "newCommandTimeout": "360",
      "adbExecTimeout": "100000",
      "platformName": "Android",
      "app": "C:\\apk\\kayak_apkpure.com.apk",
      "autoGrantPermissions": "true",
      "locale": "DE",
      "language": "de"
    }
    ));
  }

  async scrapeUntilSearch(inputData) {
    const departureDate = inputData.departureDate;
    const origin = inputData.origin;
    const destination = inputData.destination;

    const depDate = new Date(departureDate);

    const depCalendarMonth = this.monaten[depDate.getMonth()];

    const depCalendarDay = depDate.getDate();

    await this.clickOptionalLinkByResourceId(
      "com.kayak.android:id/okButton");


    await this.clickOptionalLink("Später");


    await this.clickOptionalLinkByResourceId("com.kayak.android:id/skip");
    await this.clickOptionalLinkByResourceId("com.kayak.android:id/skip");

    await this.clickElementByResource("com.kayak.android:id/oneWayPicker")

    await this.clickElementByResource("com.kayak.android:id/originCode");

    const flyingFrom = await this.getElementByResourceId("com.kayak.android:id/smartySearchText");

    await flyingFrom.setValue(origin);

    await this.appClickElementByResource('com.kayak.android:id/smarty_location_text');

    await this.clickElementByResource("com.kayak.android:id/destinationCode");

    const flyingTo = await this.getElementByResourceId("com.kayak.android:id/smartySearchText");

    await flyingTo.setValue(destination);

    await this.sleep(1000);

    await this.appClickElementByResource('com.kayak.android:id/smarty_location_text');

    await this.clickElementByResource("com.kayak.android:id/dates");

    logger.info(depCalendarMonth);
    //await this.scrollIntoView(depCalendarMonth);
    await this.scrollDownUntilVisible(depCalendarMonth);
    logger.info('scrolled into view');
    await this.sleep(1000);

    await this.scrollDownUntilNotVisible(depCalendarMonth);

    await this.clickLink(depCalendarDay + '');

    await this.clickElementByResource('com.kayak.android:id/doneTextView');

  }


  async scrapeFromSearch(inputData) {
    await this.appClickElementByResource('com.kayak.android:id/searchImage');

    await this.sleep(10000);

    await this.clickLink("Filter");
    await this.clickElementByXpath("(//android.widget.RadioButton)[3]");

    await this.clickElementByResource("com.kayak.android:id/applyButton");

    const offersSortedByBest = await this.extractOffers();


    const cheapest = await this.appiumClient.$("android=new UiScrollable(new UiSelector().scrollable(true))" +
      ".scrollIntoView(new UiSelector().resourceIdMatches(\".*cheapest.*\"))");

    await cheapest.click();

    const offersSortedByCheapest = await this.extractOffers();

    return { 'sortedByBest': offersSortedByBest, 'sortedByCheapest': offersSortedByCheapest };
  }

  async extractOffers() {

    var rect = await this.appiumClient.getWindowRect();

    var rectX = rect.width / 2;
    var rectY = rect.height / 1.1;

    var flightOffersOnScreen = []; //flight offers currently on the screen
    var flightOffers = [];

    while (true) {
      var screenshotPath = await this.takeScreenShot(this.constructor.name);
      var oldFlightOffersOnScreen = flightOffersOnScreen.slice();
      flightOffersOnScreen = [];
      var prices = await this.getElementsByResourceId('com.kayak.android:id/price');
      var departureTimes = await this.getElementsByResourceId('com.kayak.android:id/departureTime');
      var arrivalTimes = await this.getElementsByResourceId('com.kayak.android:id/arrivalTime');
      var origins = await this.getElementsByResourceId('com.kayak.android:id/originCode');
      var destinations = await this.getElementsByResourceId('com.kayak.android:id/destinationCode');
      var airLines = await this.getElementsByResourceId('com.kayak.android:id/airline');

      for (var i = 0; i < prices.length && i < departureTimes.length && i < arrivalTimes.length && i < origins.length
        && i < destinations.length && i < airLines.length; i++) {
        var flightOffer = new FlightOffer();
        const price = await prices[i].getText();
        flightOffer.price = price.replace("€", "").trim();

        const deptT = await departureTimes[i].getText();
        flightOffer.departureTime = convertTime(deptT.replace('p', 'pm').replace('a', 'am'));
        const arrT = await arrivalTimes[i].getText();
        flightOffer.arrivalTime = convertTime(arrT.replace('a', 'am').replace('p', 'pm'));
        flightOffer.origin = await origins[i].getText();
        flightOffer.destination = await destinations[i].getText();
        //flightOffer.screenshot = screenshotPath;
        const al = await airLines[i];

        flightOffer.airline = await al.getText();

        flightOffersOnScreen.push(flightOffer);

        /////////////////////////////////////////////////:
        const screenShotFlightOffer = { ...flightOffer };
        screenShotFlightOffer.screenshot = screenshotPath;

        if (_.findWhere(flightOffers, screenShotFlightOffer) == null) {
          flightOffers.push(screenShotFlightOffer);
          logger.info("adding new flight offer");
          //logger.info(JSON.stringify(flightOffer));
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

}