/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-01-15 09:53:07
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2020-08-22 17:11:01
 * @ Description:
 */


var { BaseScraper } = require('../basescraper');
var { DEFAULT_APPIUM_TIMEOUT } = require('../basescraper');
var dateFormat = require('dateformat');
var moment = require('moment');
var path = require('path');

class ExpediaScraper extends BaseScraper {

  constructor() {
    super(__dirname);
    this.name = 'Expedia';
  }

  async scrapeAppTillSearch(data) {

    const departureDate = data.departureDate;
    const origin = data.origin;
    const destination = data.destination;


    const depDate = new Date(departureDate);

    const departureDay = depDate.getDate();
    const departureMonth = this.monthNames[depDate.getMonth()];
    const departureYear = depDate.getFullYear();
    
    await this.appClickLink("Account");

    await this.appClickLink("Country");

    await this.appClickLink("Belgium");

    await this.appClickLink("OK");

    await this.appClickLink("Shop");

    await this.appClickLink("Flights");

    await this.appClickLink("ONE WAY");

    await this.appClickLink("Flying from");

    const flyingFrom = await this.appGetElement('Flying from');

    await flyingFrom.setValue(`${origin.substring(0, 4)}`);

    await this.appClickElementByResource("com.expedia.bookings:id/title_textview");

    const flyingTo = await this.appGetElement('Flying to');

    await flyingTo.setValue(`${destination.substring(0, 4)}`);

    await this.appClickElementByResource("com.expedia.bookings:id/title_textview");

    this.appiumClient.setImplicitTimeout(500);
    let elem = await this.appGetElement(departureMonth + ' ' + departureYear);
    while (elem.elementId == null) {
      await this.appClickElementByResource("com.expedia.bookings:id/next_month");
      elem = await this.appGetElement(departureMonth + ' ' + departureYear);
    }
    this.appiumClient.setImplicitTimeout(DEFAULT_APPIUM_TIMEOUT);
    await this.appClickElementByXpath("//android.view.View[contains(@content-desc,'" + departureMonth + ' ' + departureDay + "' )]");
    await this.appClickLink("DONE");

  }

  // // scrape Android app part 2: starting from  "clicking" the search button
  async scrapeAppFromSearch(data) {
    await this.appClickLink("Search");

    const price = await this.appGetElementByResourceId("com.expedia.bookings:id/price_text_view");

    const text = await price.getText();

    return text;
  }

  // scrape web part 1: until "clicking" the search button
  async scrapeWebTillSearch(data) {
    const departureDate = data.departureDate;
    const origin = data.origin;
    const destination = data.destination;


    await this.page.goto('https://www.expedia.be/?&langid=2057');

    await this.page.waitForSelector('#tab-flight-tab-hp');


    // only flight
    await this.page.click('#tab-flight-tab-hp');

    // one way flight
    await this.page.click('#flight-type-one-way-label-hp-flight');


    await this.page.waitForSelector('#flight-origin-hp-flight');

    await this.page.type('#flight-origin-hp-flight', origin.charAt(0) + origin, { delay: 60 });

    await this.page.type('#flight-destination-hp-flight', destination.charAt(0) + destination, { delay: 60 });

    await this.page.type(
      '#flight-departing-single-hp-flight',
      dateFormat(new Date(departureDate), 'dd/mm/yyyy'), { delay: 60 });
    

    await this.page.waitForSelector('.datepicker-close-btn');
    await this.page.click('.datepicker-close-btn');
  
  }

  // scrape web part 2: from "clicking" on search button
  async scrapeWebFromSearch() {

    await this.page.waitFor(1000);

    await this.page.click('.search-btn-col');
    //await this.page.waitForNavigation();
    await this.page.waitFor(1000);
   
    const text = await this.webGetElementTextByXpath("//span[@data-test-id='listing-price-dollars']");
    return text.trim();
  }

}


module.exports = ExpediaScraper;