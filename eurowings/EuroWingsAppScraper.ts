import { AppScraper } from "../AppScraper";
import { IScraper } from "../IScraper";
import dateFormat from 'dateformat';
import { FlightOffer, OfferList } from "../types";
var convertTime = require('convert-time');
var path = require('path');



export class EuroWingsAppScraper extends AppScraper implements IScraper {

  constructor() {
    const apkPath = path.join(__dirname, "Eurowings.v4.3.3_apkpure.com.apk");
    super(JSON.stringify({
      "platformName": "Android",
      "platformVersion:": "6.0",
      "deviceName": "my device",
      //"app": "C:\\projects\\diffscraper\\scraper\\eurowings\\Eurowings.v4.3.3_apkpure.com.apk",
      "app": apkPath,
      "autoGrantPermissions": "true",
      "appPackage": "com.germanwings.android",
      "deviceApiLevel": "23",
      "deviceScreenSize": "1440x2560",
      "deviceScreenDensity": "560",
      "deviceModel": "Android SDK built for x86",
      "deviceManufacturer": "unknown",
      "pixelRatio": "3.5",
      "statBarHeight": "84",
      "viewportRect": {
        "left": "0",
        "top": "84",
        "width": "1440",
        "height": "2308"
      }
    }));
  }

  async scrapeUntilSearch(inputData) {
    const departureDate = inputData.departureDate;
    const origin = inputData.origin;
    const destination = inputData.destination;

    const depDate = new Date(departureDate);
    const departureMonth = this.monthNames[depDate.getMonth()];
    const departureYear = depDate.getFullYear();

    await this.sleep(5000);

    await this.clickLink("Book flights");

    await this.clickLink("One way");

    await this.clickLink("Departure airport");

    const enterDepartureAirport = await this.getElement("Enter Airport");

    await enterDepartureAirport.setValue(`${origin.substring(0, 3)}`);

    await this.clickElementByResource('com.germanwings.android:id/flyUpEntryText');

    await this.clickLink("Arrival airport");

    const enterArrivalAirport = await this.getElement("Enter Airport");

    await enterArrivalAirport.setValue(`${destination.substring(0, 3)}`);

    await this.clickElementByResource('com.germanwings.android:id/flyUpEntryText');

    await this.clickLink("Departure flight date");

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
      '"]/following-sibling::android.widget.TextView[2]');

    await this.clickLink('Search');

    await this.sleep(5000);

    //optional accept cookie
    try {

      await this.clickElementByXpath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.RelativeLayout/android.widget.FrameLayout/android.support.v4.widget.DrawerLayout/android.widget.RelativeLayout/android.webkit.WebView/android.webkit.WebView/android.view.View/android.view.View[1]/android.view.View[2]/android.view.View[2]/android.view.View/android.widget.Button");
    }
    catch (ex) { }


    await this.sleep(5000);

    const depTime = await this.getAttrTextByXpath("//android.view.View[@bounds='[120,828][522,903]']"
      , 'text');


    const arrTime = await this.getAttrTextByXpath("//android.view.View[@bounds='[522,828][924,903]']", 'text');
    // // const arrTxt = await arr.getAttribute('content-desc');

    const price = await this.getAttrTextByXpath("//android.view.View[@bounds='[924,828][1320,903]']", 'text');
    // // const priceTxt = await price.getAttribute('content-desc');

    const flNr = await this.getAttrTextByXpath("//android.view.View[@bounds='[120,966][522,1023]']", 'text');
    // // const flNrTxt = await flNr.getAttribute('content-desc');
    var screenshot = await this.takeScreenShot(this.constructor.name);

    var flightOffers = [];
    var flightOffer = new FlightOffer();
    flightOffer.departureTime = convertTime(depTime);
    flightOffer.arrivalTime = convertTime(arrTime);
    flightOffer.flightNumber = flNr;
    flightOffer.origin = inputData.origin;
    flightOffer.destination = inputData.destination;
    flightOffer.price = price;
    flightOffer.screenshot = screenshot;
    flightOffers.push(flightOffer);

    return flightOffers;

  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}