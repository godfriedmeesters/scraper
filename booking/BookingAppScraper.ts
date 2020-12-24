import { AppScraper } from "../AppScraper";
import { IScraper } from "../IScraper";
import { HotelOffer, OfferList } from "../types";
var path = require('path');

import { logger } from "../logger";
import Translator from "simple-translator";
const de = require('date-and-time/locale/de');
import date from 'date-and-time';
import * as _ from 'underscore';


var fs = require('fs');



export class BookingAppScraper extends AppScraper implements IScraper {


  constructor() {
    const apkPath = path.join(__dirname, "com.booking_25.2.apk");

    super(JSON.stringify({
      "platformName": "Android",
      "buildToolsVersion": "28.0.3",
      "deviceName": "emulator-5554",
      "app": apkPath,
      //"app": "C:\\projects\\diffscraper\\scraper\\opodo\\opodo.apk",
      "autoGrantPermissions": "true",
      "locale": "DE",
      "language": "de",
      //'fullReset': "true"
      // "appPackage": "com.opodo.reisen",
      // "appActivity": "com.odigeo.app.android.home.HomeContainerView"
    }
    ));

    date.locale("de");  //set to nl or de
    // var obj = JSON.parse(fs.readFileSync(path.join(__dirname, "lang.json"), 'utf8'));
    // Translator.registerDefaultLanguage("nl", obj.Dutch);
    // Translator.registerLanguage("de", obj.German);

    // Translator.changeLanguage("nl");
  }

  async scrapeUntilSearch(inputData) {
    const destination = inputData.location;

    const checkinDate = new Date(inputData.checkinDate);
    await this.sleep(3000);
    await this.clickOptionalLink(Translator.translate("Akzeptieren"));
    await this.sleep(3000);
    await this.appiumClient.touchAction({ action: 'tap', x: 80, y: 250 });

    await this.sleep(3000);
    await this.clickElementByXpath("//android.widget.ImageButton[@content-desc=\"Open\"]");
    await this.scrollDownUntilVisible(Translator.translate("Einstellungen"));
    await this.clickLink("Einstellungen");
    await this.clickLink("Währung");

    await this.scrollUpUntilTextVisible("Euro (€)");
    await this.clickLink("Euro (€)");
    await this.appClickElementByXpath("//android.widget.ImageButton[@content-desc=\"" + "Nach oben" + "\"]");

    await this.appClickElementByResource("com.booking:id/search_details_text");

    const destTxt = await this.getElementByResourceId("com.booking:id/disambiguation_search_edittext");
    await destTxt.setValue(destination);
    //await this.clickElementByXpath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.LinearLayout/android.view.ViewGroup[2]/android.widget.ScrollView/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.LinearLayout/androidx.recyclerview.widget.RecyclerView/android.widget.RelativeLayout[1]");
    await this.appClickElementByResource("com.booking:id/disam_list_subroot");

    const strCheckinDate = date.format(checkinDate, "DD MMMM YYYY");

    await this.scrollDownUntilDescVisible(strCheckinDate);
    await this.clickElementByXpath('//android.view.View[@content-desc="' + strCheckinDate + '"]');

    checkinDate.setDate(checkinDate.getDate() + 1);
    const strCheckinDatePlus1 = date.format(checkinDate, "DD MMMM YYYY");
    await this.clickElementByXpath('//android.view.View[@content-desc="' + strCheckinDatePlus1 + '"]');


    await this.clickElementByResource('com.booking:id/calendar_confirm');

    await this.sleep(5000);

  }

  async scrapeFromSearch(inputData) {
    await this.appClickElementByResource("com.booking:id/search_search");

    await this.sleep(10000);

    /*******************************************/
    var rect = await this.appiumClient.getWindowRect();

    await this.sleep(1000);

    var rectX = rect.width / 3;
    var rectY = rect.height / 1.1;

    var hotelOffersOnScreen = []; //flight offers currently on the screen
    var hotelOffers = [];

    var initPrices =  await this.getElementsByResourceId('com.booking:id/price_view_price');

    var lastPriceOffScreenText = await initPrices[0].getText();

    var bounds = await initPrices[0].getAttribute("bounds");
    var lastPriceOffScreenY = parseInt(bounds.match(/\d+/g)[1]);

    while (true) {
      console.log("last price offscreen = " + lastPriceOffScreenText)
      var oldHotelOffersOnScreen = hotelOffersOnScreen.slice();
      hotelOffersOnScreen = [];
      var prices = await this.getElementsByResourceId('com.booking:id/price_view_price');
      var hotelNames = await this.getElementsByResourceId('com.booking:id/sr_property_card_header_property_name');

      var screenshot = await this.takeScreenShot(this.constructor.name);

      for (var i = 0; i < prices.length && i < hotelNames.length; i++) {
        var hotelOffer = new HotelOffer();

        var bounds = await hotelNames[i].getAttribute("bounds");
        const hotelnameY = parseInt(bounds.match(/\d+/g)[1]);

        if (prices.length == 0) {
          hotelOffer.price =  lastPriceOffScreenText;
        }
        else if (prices.length == 1) {
          bounds = await prices[0].getAttribute("bounds");
          const priceY = parseInt(bounds.match(/\d+/g)[1]);
          if (hotelnameY < priceY) {
            hotelOffer.price =  lastPriceOffScreenText;
          }
          else {
            hotelOffer.price = await prices[0].getText();
          }
        }
        else if (prices.length > 1) {
          if (hotelnameY > lastPriceOffScreenY) {
            hotelOffer.price = lastPriceOffScreenText;
          }

          for (var j = 0; j < prices.length; j++) {
            bounds = await prices[j].getAttribute("bounds");
            const priceY = parseInt(bounds.match(/\d+/g)[1]);

            if (hotelnameY > priceY) {
              hotelOffer.price = await prices[j].getText();
            }
          }
        }

        hotelOffer.hotelName = await hotelNames[i].getText();



        hotelOffersOnScreen.push(hotelOffer);

        const screenShotFlightOffer = { ...hotelOffer };
        screenShotFlightOffer.screenshot = screenshot;

        if (_.findWhere(hotelOffers,  screenShotFlightOffer) == null) {


          hotelOffers.push( screenShotFlightOffer);


          logger.info("adding new hotel offer");
        }
        else {
          logger.info("skipping hotel offer");
        }
      }

      if (prices.length > 0) {
        var bounds = await prices[prices.length - 1].getAttribute("bounds");
        const newLastPriceOffScreenY = parseInt(bounds.match(/\d+/g)[1]);
        lastPriceOffScreenY = newLastPriceOffScreenY;
        lastPriceOffScreenText = await prices[prices.length - 1].getText();
      }

      if (_.isEqual(oldHotelOffersOnScreen, hotelOffersOnScreen)) {
        break;
      }

      await this.appiumClient.touchAction([
        { action: 'press', x: rectX, y: rectY },
        { action: 'wait', ms: 500 },
        { action: 'moveTo', x: rectX, y: rectY * 0.4 },
        'release',
      ]);

    }

    return  hotelOffers;


    // var rect = await this.appiumClient.getWindowRect();
    // var rectX = rect.width / 3;
    // var rectY = rect.height / 1.1;

    // var hotelOffersOnScreen = []; //flight offers currently on the screen
    // var hotelOffers = [];

    // var initPrices = await this.getElementsByResourceId('com.booking:id/price_view_price');

    // var lastPriceOffScreenText = await initPrices[0].getText();

    // var bounds = await initPrices[0].getAttribute("bounds");
    // var lastPriceOffScreenY = parseInt(bounds.match(/\d+/g)[1]);


    // while (true) {
    //   //console.log("last price offscreen = " + lastPriceOffScreenText)
    //   var oldHotelOffersOnScreen = hotelOffersOnScreen.slice();
    //   hotelOffersOnScreen = [];
    //   var prices = await this.getElementsByResourceId('com.booking:id/price_view_price');
    //   var hotelNames = await this.getElementsByResourceId('com.booking:id/sr_property_card_header_property_name');
    //   var screenshot = await this.takeScreenShot(this.constructor.name);

    //   logger.info("found " + prices.length  + " prices");

    //   for (var i = 0; i < prices.length && i < hotelNames.length; i++) {
    //     var hotelOffer = new HotelOffer();

    //     var bounds = await hotelNames[i].getAttribute("bounds");
    //     const hotelNameY = parseInt(bounds.match(/\d+/g)[1]);

    //     if (prices.length == 0) {
    //       hotelOffer.price = lastPriceOffScreenText;
    //     }
    //     else if (prices.length == 1) {
    //       bounds = await prices[0].getAttribute("bounds");
    //       const priceY = parseInt(bounds.match(/\d+/g)[1]);
    //       if (hotelNameY < priceY) {
    //         hotelOffer.price = lastPriceOffScreenText;
    //       }
    //       else {
    //         hotelOffer.price = await prices[0].getText();
    //       }
    //     }
    //     else if (prices.length > 1) {
    //       if (hotelNameY > lastPriceOffScreenY) {
    //         hotelOffer.price = lastPriceOffScreenText;
    //       }

    //       for (var j = 0; j < prices.length; j++) {
    //         bounds = await prices[j].getAttribute("bounds");
    //         const priceY = parseInt(bounds.match(/\d+/g)[1]);

    //         if (hotelNameY > priceY) {
    //           hotelOffer.price = await prices[j].getText();
    //         }
    //       }
    //     }


    //     hotelOffer.searchLocation = inputData.location;
    //     hotelOffer.checkinDate = inputData.checkinDate;

    //     hotelOffersOnScreen.push(hotelOffer);
    //     logger.info("found hotel offer " + JSON.stringify(hotelOffer));

    //     const screenShotHotelOffer = { ...hotelOffer };
    //     screenShotHotelOffer.screenshot = screenshot;

    //     if (_.findWhere(hotelOffers, screenShotHotelOffer) == null) {

    //       screenShotHotelOffer.price = screenShotHotelOffer.price.replace("€", "").trim();
    //       hotelOffers.push(screenShotHotelOffer);

    //       logger.info("adding new hotel offer");
    //     }
    //     else {
    //       logger.info("skipping hotel offer");
    //     }
    //   }

    //   if (prices.length > 0) {
    //     var bounds = await prices[prices.length - 1].getAttribute("bounds");
    //     const newLastPriceOffScreenY = parseInt(bounds.match(/\d+/g)[1]);
    //     lastPriceOffScreenY = newLastPriceOffScreenY;
    //     lastPriceOffScreenText = await prices[prices.length - 1].getText();
    //   }

    //   if (_.isEqual(oldHotelOffersOnScreen, hotelOffersOnScreen)) {
    //     break;
    //   }


    //   await this.appiumClient.touchAction([
    //     { action: 'press', x: rectX, y: rectY },
    //     { action: 'wait', ms: 500 },
    //     { action: 'moveTo', x: rectX, y: rectY * 0.4 },
    //     'release',
    //   ]);

    // }

    // return hotelOffers;

  }


}