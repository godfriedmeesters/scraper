/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-27 16:00:27
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-03-11 18:16:23
 * @ Description:
 */

import { AppScraper } from "../../AppScraper";


import { IScraper } from "../../IScraper";
import { FlightOffer } from "../../types";
var convertTime = require('convert-time');

export class EuroWingsAppScraper extends AppScraper implements IScraper {

  constructor() {

    super(JSON.stringify({
      "platformName": "Android",
      "app": "c:\\apk\\Eurowings.v4.3.3_apkpure.com.apk",
      "autoGrantPermissions": "true",
      "adbExecTimeout": "100000",
    }));
  }

  async scrapeUntilSearch(inputData) {
    const departureDate = inputData.departureDate;
    const origin = inputData.origin;
    const destination = inputData.destination;

    const depDate = new Date(departureDate);
    const departureMonth = this.monaten[depDate.getMonth()];
    const departureYear = depDate.getFullYear();

    await this.sleep(5000);

    await this.clickLink("Flüge buchen");

    await this.clickLink("Nur Hinflug");

    await this.clickLink("Abflughafen");

    const enterDepartureAirport = await this.getElement("Flughafen eingeben");

    await enterDepartureAirport.setValue(`${origin}`);

    await this.clickElementByResource('com.germanwings.android:id/flyUpEntryText');

    await this.clickLink("Zielflughafen");

    const enterArrivalAirport = await this.getElement("Flughafen eingeben");

    await enterArrivalAirport.setValue(`${destination}`);
    await this.sleep(500);

    await this.clickElementByResource('com.germanwings.android:id/flyUpEntryText');

    await this.clickLink("Hinflugdatum");

    await this.scrollIntoView(departureMonth + ' ' + departureYear);
    await this.scrollDownUntilNotVisible(departureMonth + ' ' + departureYear);
  }

  // scrape Android app part 2: starting from  "clicking" the search button
  async scrapeFromSearch(inputData) {

    const departureDate = inputData.departureDate;

    const depDate = new Date(departureDate);
    const departureDay = depDate.getDate();

    await this.clickElementByXpath('//android.widget.TextView[@text="' +
      departureDay +
      '"]');

    await this.clickLink('Suchen');

    await this.sleep(5000);

    //optional accept cookie
    try {

      await this.appiumClient.touchAction([
        {action: 'press', x: 668, y: 863},
        {action: 'moveTo', x: 670, y: 624},
        'release'
      ]);

      await this.clickElementByXpath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.RelativeLayout/android.widget.FrameLayout/android.support.v4.widget.DrawerLayout/android.widget.RelativeLayout/android.webkit.WebView/android.webkit.WebView/android.view.View/android.view.View[1]/android.view.View[2]/android.view.View[2]/android.view.View/android.widget.Button");
    }
    catch (ex) { }


    await this.sleep(5000);

    const depTime = await this.getElementTextByXpath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.RelativeLayout/android.widget.FrameLayout/android.support.v4.widget.DrawerLayout/android.widget.RelativeLayout/android.webkit.WebView/android.webkit.WebView/android.view.View/android.view.View[1]/android.view.View/android.view.View[2]/android.view.View/android.view.View[3]/android.view.View/android.view.View[2]/android.view.View[1]/android.view.View[1]");

    const arrTime = await this.getElementTextByXpath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.RelativeLayout/android.widget.FrameLayout/android.support.v4.widget.DrawerLayout/android.widget.RelativeLayout/android.webkit.WebView/android.webkit.WebView/android.view.View/android.view.View[1]/android.view.View/android.view.View[2]/android.view.View/android.view.View[3]/android.view.View/android.view.View[2]/android.view.View[1]/android.view.View[3]");

   const price = await this.getElementTextByXpath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.RelativeLayout/android.widget.FrameLayout/android.support.v4.widget.DrawerLayout/android.widget.RelativeLayout/android.webkit.WebView/android.webkit.WebView/android.view.View/android.view.View[1]/android.view.View/android.view.View[2]/android.view.View/android.view.View[3]/android.view.View/android.view.View[2]/android.view.View[2]");


    const flNr = await this.getElementTextByXpath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.RelativeLayout/android.widget.FrameLayout/android.support.v4.widget.DrawerLayout/android.widget.RelativeLayout/android.webkit.WebView/android.webkit.WebView/android.view.View/android.view.View[1]/android.view.View/android.view.View[2]/android.view.View/android.view.View[3]/android.view.View/android.view.View[3]/android.view.View[1]/android.view.View[1]");

    var screenshot = await this.takeScreenShot(this.constructor.name);

    var flightOffers = [];
    var flightOffer = new FlightOffer();
    flightOffer.departureTime = depTime;
    flightOffer.arrivalTime = arrTime;
    flightOffer.flightNumber = flNr;
    flightOffer.origin = inputData.origin;
    flightOffer.destination = inputData.destination;
    flightOffer.price = price.replace("EUR","").trim();
    flightOffer.screenshot = screenshot;
    flightOffers.push(flightOffer);

    return flightOffers;

  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}