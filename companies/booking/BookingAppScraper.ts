/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-12-03 15:04:24
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-05-23 16:38:21
 * @ Description:
 */



import { AppScraper } from "../../AppScraper";
import { IScraper } from "../../IScraper";
import { HotelOffer } from "../../types";
var path = require('path');

import { logger } from "../../logger";
import Translator from "simple-translator";
const de = require('date-and-time/locale/de');
import date from 'date-and-time';
import * as _ from 'underscore';


var fs = require('fs');



export class BookingAppScraper extends AppScraper implements IScraper {


  constructor() {

    super(JSON.stringify({
      "newCommandTimeout": "360",
      "platformName": "Android",
      "app": "c:\\apk\\com.booking_25.2.apk",
      "autoGrantPermissions": "true",
      "locale": "DE",
      "language": "de",
      "adbExecTimeout": "100000",
      "appWaitActivity": "*"
    }
    ));

    date.locale("de");  //set to nl or de

  }

  async scrapeUntilSearch(inputData) {
    const destination = inputData.location;

    const checkinDate = new Date(inputData.checkinDate);
    await this.sleep(3000);
    await this.clickOptionalLink(Translator.translate("Akzeptieren"));
    await this.sleep(3000);
    await this.appiumClient.touchAction({ action: 'tap', x: 83, y: 200 });

    await this.sleep(3000);
    // await this.clickElementByXpath("//android.widget.ImageButton[@content-desc=\"Open\"]");
    // await this.scrollDownUntilVisible(Translator.translate("Einstellungen"));
    // await this.clickLink("Einstellungen");
    // await this.clickLink("Währung");

    // await this.scrollUpUntilTextVisible("Euro (€)");
    // await this.clickLink("Euro (€)");
    // await this.appClickElementByXpath("//android.widget.ImageButton[@content-desc=\"" + "Nach oben" + "\"]");

    await this.appClickElementByResource("com.booking:id/search_details_text");

    const destTxt = await this.getElementByResourceId("com.booking:id/disambiguation_search_edittext");
    await destTxt.setValue(destination);
    //await this.clickElementByXpath("/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.LinearLayout/android.view.ViewGroup[2]/android.widget.ScrollView/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.LinearLayout/androidx.recyclerview.widget.RecyclerView/android.widget.RelativeLayout[1]");
    await this.appClickElementByResource("com.booking:id/disam_list_subroot");

    const strCheckinDate = date.format(checkinDate, "DD MMMM YYYY");

    await this.scrollDownUntilDescVisible(strCheckinDate);

    var rect = await this.appiumClient.getWindowRect();


    var rectX = rect.width / 2;
    var rectY = rect.height / 1.1;

    await this.appiumClient.touchAction([
      { action: 'press', x: rectX, y: rectY * 0.60 },
      { action: 'wait', ms: 500 },
      { action: 'moveTo', x: rectX, y: rectY * 0.55 },
      'release',
  ]);

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
    await this.clickLink("Filter");



    await this.scrollIntoView("Entfernung vom Stadtzentrum");

    var rect = await this.appiumClient.getWindowRect();


    var rectX = rect.width / 2;
    var rectY = rect.height / 1.5;

    await this.appiumClient.touchAction([
      { action: 'press', x: rectX, y: rectY * 0.60 },
      { action: 'wait', ms: 500 },
      { action: 'moveTo', x: rectX, y: rectY * 0.55 },
      'release',
    ]);




    await this.clickLinkContains("5 km");


    await this.appClickElementByResource("com.booking:id/showresults");

    const offersSortedByBest = await this.extractOffers();

    await this.clickElementByResource('com.booking:id/sresults_sort');

    await this.clickElementByXpath('/hierarchy/android.widget.FrameLayout/android.widget.LinearLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.FrameLayout/android.widget.ScrollView/android.widget.LinearLayout/android.widget.CheckedTextView[6]');


    const offersSortedByCheapest = await this.extractOffers();

    return { 'sortedByBest': offersSortedByBest, 'sortedByCheapest': offersSortedByCheapest };

  }

  async extractOffers() {
    var rect = await this.appiumClient.getWindowRect();

    await this.sleep(1000);

    var rectX = rect.width / 3;
    var rectY = rect.height / 1.1;

    var hotelOffersOnScreen = []; //flight offers currently on the screen
    var hotelOffers = [];

    var initPrices = await this.getElementsByResourceId('com.booking:id/price_view_price');

    var lastPriceOffScreenText = await initPrices[0].getText();

    var bounds = await initPrices[0].getAttribute("bounds");
    var lastPriceOffScreenY = parseInt(bounds.match(/\d+/g)[1]);

    while (true) {
      console.log("last price offscreen = " + lastPriceOffScreenText)
      var oldHotelOffersOnScreen = hotelOffersOnScreen.slice();
      hotelOffersOnScreen = [];
      var prices = await this.getElementsByResourceId('com.booking:id/price_view_price');
      var hotelNames = await this.getElementsByResourceId('com.booking:id/sr_property_card_header_property_name');

      logger.info(`Found ${hotelNames.length} hotels `);
      logger.info(`Found ${prices.length} prices `);


      var screenshot = await this.takeScreenShot(this.constructor.name);

      for (var i = 0; i < prices.length && i < hotelNames.length; i++) {


        const hotelName = await hotelNames[i].getText();


        var hotelOffer = new HotelOffer();

        var bounds = await hotelNames[i].getAttribute("bounds");
        const hotelnameY = parseInt(bounds.match(/\d+/g)[1]);

        logger.info(`Checking hotel ${hotelName} with y pos ${hotelnameY} `);



        if (prices.length == 0) {
          logger.info("case 0");
          hotelOffer.price = lastPriceOffScreenText;
        }
        else if (prices.length == 1) {
          logger.info("case 1");
          bounds = await prices[0].getAttribute("bounds");
          const priceY = parseInt(bounds.match(/\d+/g)[1]);
          logger.info(`price Y = ${priceY}`);
          if (hotelnameY < priceY) {
            hotelOffer.price = await prices[0].getText();
          }
          else {
            hotelOffer.price = lastPriceOffScreenText;
          }
        }
        else if (prices.length > 1) {
          logger.info(`case > 1, last price off screen = ${lastPriceOffScreenText} with y pos = ${lastPriceOffScreenY}`);
       //   if (hotelnameY < lastPriceOffScreenY) {
         //   hotelOffer.price = lastPriceOffScreenText;
         // }

          for (var j = 0; j < prices.length; j++) {
            bounds = await prices[j].getAttribute("bounds");
            const priceY = parseInt(bounds.match(/\d+/g)[1]);

            logger.info(`hotel y = ${hotelnameY}`);
            logger.info(`price y = ${priceY}`);

            if (hotelnameY < priceY) {
              hotelOffer.price = await prices[j].getText();
              break;
            }
          }
        }

        hotelOffer.hotelName = await hotelNames[i].getText();

        hotelOffersOnScreen.push(hotelOffer);

        const screenShotHotelOffer = { ...hotelOffer };
        screenShotHotelOffer.screenshot = screenshot;

        logger.info(`trying to add offer ${JSON.stringify(hotelOffer)}`);

        const strippedOffer = { ...hotelOffer };
        delete strippedOffer.price;

        if ("price" in screenShotHotelOffer) {
          if (_.findWhere(hotelOffers, strippedOffer) == null) {
            hotelOffers.push(screenShotHotelOffer);
            logger.info("adding new hotel offer");
          }
        }
        else {
          logger.info("skipping hotel offer");
        }

        //        await this.sleep(10000);
      }

      if (prices.length > 0) {
        var bounds = await prices[prices.length - 1].getAttribute("bounds");
        const newLastPriceOffScreenY = parseInt(bounds.match(/\d+/g)[1]);
        lastPriceOffScreenY = newLastPriceOffScreenY;
        lastPriceOffScreenText = await prices[prices.length - 1].getText();

        logger.info(`${lastPriceOffScreenY}: ${lastPriceOffScreenText}`);
      }

      if (_.isEqual(oldHotelOffersOnScreen, hotelOffersOnScreen)) {
        break;
      }

      await this.appiumClient.touchAction([
        { action: 'press', x: rectX, y: rectY },
        { action: 'wait', ms: 500 },
        { action: 'moveTo', x: rectX, y: rectY * 0.6 },
        'release',
      ]);

      rect = await this.appiumClient.getWindowRect();

    }

    return hotelOffers;


  }


}