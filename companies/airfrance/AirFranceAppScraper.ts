/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-27 16:00:26
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-03-12 08:56:48
 * @ Description:
 */



import { AppScraper } from "../../AppScraper";
import { IScraper } from "../../IScraper";

import date from 'date-and-time';
import { FlightOffer } from "../../types";

import { logger } from "../../logger";
var path = require('path');

export class AirFranceAppScraper extends AppScraper implements IScraper {
  constructor() {

    super(JSON.stringify({
      "newCommandTimeout": "360",
      "adbExecTimeout": "100000",
      "platformName": "Android",
      "app": "c:\\apk\\AirFrance_v5.1.0_apkpure.com.apk",
      "autoGrantPermissions": "true",
      "locale": "DE",
      "language": "de",
      "appActivity": "com.airfrance.android.totoro.ui.activity.main.MainActivity",
      "appPackage": "com.airfrance.android.dinamoprd"
    }));

    date.locale("de");
  }

  async scrapeUntilSearch(inputData) {

    const departureDate = inputData.departureDate;
    const origin = inputData.origin;
    const destination = inputData.destination;

    const depDate = new Date(departureDate);

    const departureDay = depDate.getDate();

    await this.clickOptionalLink("Später");

    await this.clickOptionalLink("App ohne Anmeldung nutzen >");



    await this.clickLink("Kaufen");

    await this.sleep(1000);


    await this.appClickElementByResource("com.airfrance.android.dinamoprd:id/ebt0_card_title");

    await this.clickElementByXpath('//android.widget.LinearLayout[@content-desc="Nur Hinflug"]/android.widget.TextView');

    await this.clickLink("Von");

    const enterDepartureAirport = await this.getElement("   Suche")

    await enterDepartureAirport.setValue(origin);

    await this.clickElementByResource("com.airfrance.android.dinamoprd:id/airport_list_iata_code");

    await this.clickLink("Nach");

    const enterArrivalAirport = await this.getElement("   Suche");
    await enterArrivalAirport.setValue(destination);

    await this.clickElementByResource("com.airfrance.android.dinamoprd:id/airport_list_iata_code");

    // await this.clickLink("DATEN AUSWÄHLEN");
    await this.appClickElementByResource("com.airfrance.android.dinamoprd:id/button_confirm");

    const mY = date.format(depDate, "MMMM YYYY");

    logger.info("looking for " + mY);

    await this.scrollIntoView(mY);

    await this.scrollDownUntilNotVisible(mY);
    await this.clickElementByXpath('//android.widget.TextView[@text="' +
      departureDay +
      '"]');
  }

  async scrapeFromSearch(data) {
    const departureDate = data.departureDate;
    const depDate = new Date(departureDate);
    const departureDay = depDate.getDate();
    //let elem = await this.appiumClient.$(
   //   this._('text("DATUM BESTÄTIGEN")')
    //);

    //await elem.click();

await this.appClickElementByResource("com.airfrance.android.dinamoprd:id/calendar_footer_confirm_button");


    const elem = await this.appiumClient.$(
      '//android.widget.TextView[@text="' +
      departureDay +
      '"]/following-sibling::android.widget.TextView[1]'
    )


    var screenshot = await this.takeScreenShot(this.constructor.name);

    var departureTimes = await this.getElementsByResourceId('com.airfrance.android.dinamoprd:id/flight_card_outbound_time');
    var arrivalTimes = await this.getElementsByResourceId('com.airfrance.android.dinamoprd:id/flight_card_inbound_time');
    var flightNumbers = await this.getElementsByResourceId('com.airfrance.android.dinamoprd:id/flight_card_flight_number');
    var origins = await this.getElementsByResourceId('com.airfrance.android.dinamoprd:id/flight_card_outbound_iata_code');
    var destinations = await this.getElementsByResourceId('com.airfrance.android.dinamoprd:id/flight_card_inbound_iata_code');
    var prices = await this.getElementsByResourceId('com.airfrance.android.dinamoprd:id/flight_card_price');
    var transfers = await this.getElementsByResourceId('com.airfrance.android.dinamoprd:id/flight_card_transfer_text');


    var flightOffers = [];
    for (var i = 0; i < departureTimes.length; i++) {
      const transferText = await transfers[i].getText();
      if (transferText == "Direktflug") {
        var flightOffer = new FlightOffer();
        flightOffer.departureTime = await departureTimes[i].getText();
        flightOffer.arrivalTime = await arrivalTimes[i].getText();
        flightOffer.flightNumber = await flightNumbers[i].getText();
        flightOffer.origin = await origins[i].getText();
        flightOffer.destination = await destinations[i].getText();
        flightOffer.price = await prices[i].getText();
        flightOffer.price = flightOffer.price.replace("EUR", "").trim()
        flightOffer.screenshot = screenshot;
        flightOffers.push(flightOffer);
      }
    }

    return flightOffers;
  }
}