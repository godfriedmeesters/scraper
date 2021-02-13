/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-01-15 09:53:08
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-02-12 14:21:17
 * @ Description:
 */


var { BaseScraper } = require('../basescraper');
var dateFormat = require('dateformat');
var path = require('path');

class KayakScraper extends BaseScraper {

  constructor() {
    super(__dirname);
    this.name = 'Kayak';
  }

  async scrapeAppTillSearch(data) {

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    var tom = dateFormat(tomorrow, "mmm d");

    const departureDate = data.departureDate;
    const origin = data.origin;
    const destination = data.destination;

    const depDate = new Date(departureDate);

    const depCalendarMonth = dateFormat(depDate, "mmm");

    const depCalendarDay = depDate.getDate();

    await this.appClickLink("Skip");

    await this.appClickLink("Allow notifications");

    await this.appClickElementByXpath("//android.widget.ImageButton[contains(@content-desc,'Open navigation drawer' )]");

    await this.appClickLink("Currency");

    await this.appClickLink("Euro");

    await this.appClickLink("Region");

    this.appiumClient.$(
      'android=new UiScrollable(new UiSelector()' +
      '.className("android.widget.LinearLayout")).scrollIntoView(' +
      'new UiSelector().text("' + "Nederland" +
      '"));'
    );

    await this.appClickLink("Nederland");

    await this.appClickLink("Search");

    await this.appClickLink("One-way");

    await this.appClickLink("AMS");

    const flyingFrom = await this.appGetElement("From where?");

    await flyingFrom.setValue(`${origin.substring(0, 5)}`);

    await this.appClickElementByResource('com.kayak.android:id/smarty_location_text');

    await this.appClickLink("To");

    const flyingTo = await this.appGetElement("To where?");

    await flyingTo.setValue(`${destination.substring(0, 5)}`);

    await this.appClickElementByResource('com.kayak.android:id/smarty_location_text');


    await this.appClickLink(tom);

    await this.appScrollIntoView(depCalendarMonth);

    await this.appScrollDownUntilNotVisible(depCalendarMonth);

    await this.appClickLink(depCalendarDay + '');

    await this.appClickLink('Apply');


  }

  // // scrape Android app part 2: starting from  "clicking" the search button
  async scrapeAppFromSearch() {

    await this.appClickElementByResource('com.kayak.android:id/searchImage');

    await this.appClickLink('Cheapest');

    const price = await this.appGetElementByResourceId('com.kayak.android:id/price');
    const text = await price.getText();
    return text.trim();
  }


  // scrape web part 1: until "clicking" the search button
  async scrapeWebTillSearch(data) {
    const departureDate = data.departureDate;
    const origin = data.origin;
    const destination = data.destination;


    await this.page.goto('https://www.kayak.nl/flights');

    await this.webClickElementByXpath("//button[contains(@title, 'Accepteren')]");

    await this.webClickElementByXpath("//div[contains(@id, 'switch')]");

    await this.webClickElementByXpath("//li[contains(@data-value, 'oneway')]");

    await this.webClickElementByXpath("//button[contains(@class, 'remove-selection')]");

    await this.page.waitFor(500);

    const from1 = await this.page.$x("//input[contains(@id, 'origin-airport')]");
    await from1[0].type(origin, { delay: 50 });
    await this.tapEnter();

    await this.page.waitFor(500);
    await this.webClickElementByXpath("//div[contains(@id, 'destination-airport')]");
    await this.page.waitFor(500);


    const to1 = await this.page.$x("//input[contains(@id, 'destination-airport')]");
    await to1[0].type(destination, { delay: 50 });
    await this.tapEnter();

    await this.page.waitFor(500);
    await this.webClickElementByXpath("//span[contains(text(), 'eDreams')]");

    await this.webClickElementByXpath("//div[contains(@id, 'dateRangeInput-display')]");

    this.page.waitFor(500);
    const selDate = await this.webGetElementByXpath("//div[contains(@aria-label, 'Vertrekdatum')]");

    await selDate[0].type(dateFormat(new Date(departureDate), 'dd-mm-yyyy'), { delay: 50 });

    await this.tapEnter();

    this.page.waitFor(500);

  }

  // scrape web part 2: from "clicking" on search button
  async scrapeWebFromSearch(data) {
    await this.webClickElementByXpath("//button[contains(@title, 'Zoek vluchten')]");

    await this.page.waitFor(2000);
    this.tapEnter();
    await this.page.waitFor(500);
    const gk = await this.webGetElementByXpath("//span[contains(text(), 'Goedkoopste')]");


    await gk[0].click();

    const text = await this.webGetElementTextByXpath("//a[contains(@aria-label,'Sorteer op Goedkoopste')]//span[contains(@class,'price')]");


    return text.trim();
  }


}


module.exports = KayakScraper;