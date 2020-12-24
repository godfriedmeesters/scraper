/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-01-15 09:53:08
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2020-07-27 22:04:44
 * @ Description:
 */


var { BaseScraper } = require('../basescraper');
var dateFormat = require('dateformat');
var moment = require('moment');
var path = require('path');

class OpodoScraper extends BaseScraper {

  constructor() {
    super(__dirname);
    this.name = 'Opodo';
  }

  async scrapeAppTillSearch(data) {
    const departureDate = data.departureDate;
    const origin = data.origin;
    const destination = data.destination;


    const depDate = new Date(departureDate);

    const departureDay = depDate.getDate();
    const departureMonth = this.monthNames[depDate.getMonth()];
    const departureYear = depDate.getFullYear();

    await this.appClickLink("Choose your destination");
    await this.appClickLink("One way");

    await this.appClickLink("Origin");

    const flyingFrom = await this.appGetElementByResourceId("com.opodo.reisen:id/search_src_text")
    await flyingFrom.setValue(`${origin.substring(0, 4)}`);
    await this.appClickElementByResource("com.opodo.reisen:id/txtCityName");

    await this.appClickLink("Destination");

    const flyingTo = await this.appGetElementByResourceId("com.opodo.reisen:id/search_src_text")
    await flyingTo.setValue(`${destination.substring(0, 4)}`);
    await this.appClickElementByResource("com.opodo.reisen:id/txtCityName");

    await this.appClickLink("Departure date");


    await this.appScrollIntoView(departureMonth + ' ' + departureYear);

    await this.appScrollDownUntilNotVisible(departureMonth + ' ' + departureYear);

    const departureDateChoice = await this.appiumClient.$(
      '//android.widget.TextView[@text="' +
      departureDay +
      '"]'
    );

    await departureDateChoice.click();

    await this.appClickLink("Continue");

  }

  // // scrape Android app part 2: starting from  "clicking" the search button
  async scrapeAppFromSearch() {

    await this.appClickLink("Search flights");
    await this.appScrollDownUntilNotVisible('The smart choice!', 300);


    await this.appScrollIntoView("Departure");

    const price = await this.appGetElementByResourceId('com.opodo.reisen:id/flights_price');

    const text = await price.getText();

    return text.trim();
  }


 
  
  // scrape web part 1: until "clicking" the search button
  async scrapeWebTillSearch(data) {
    const departureDate = data.departureDate;
    const origin = data.origin;
    const destination = data.destination;


    await this.page.goto('https://www.opodo.com');
    await this.webClickElementByXpath("//span[contains(text(), 'One way')]");

    const from = await this.page.$x("//input[@tabindex='11']");
    await from[0].type(origin, { delay: 50 });

     await this.tapEnter();

   
    const to = await this.page.$x("//input[@tabindex='13']");
    await to[0].type(destination, { delay: 50 });
    await this.tapEnter();

    let dayFound = false;

    const calendarDate = dateFormat(departureDate, "yyyy-mm-dd");


    while (!dayFound) {
      try {

        await this.page.waitForSelector('.day_' + calendarDate, {
          timeout: 500, visible: true
        });
        await this.page.click('.day_' + calendarDate);

        dayFound = true;

      } catch (error) {
        await this.webClickElementByXpath("//div[@class='arrow' and @data-direction='next']");
      }
    }

    this.logger.info("Clicked date, moving on ...");


  }

  // scrape web part 2: from "clicking" on search button
  async scrapeWebFromSearch(data) {   
    await  this.webClickElementByCss('.od-flightsManager-search-flight-button');
    const element = await this.webGetElementTextByCss('.sorting_tab_price');

    const text = await this.page.evaluate(() => Array.from(document.querySelectorAll('.sorting_tab_price'), element => element.textContent));


    return text[1].trim();
  }


}


module.exports = OpodoScraper;