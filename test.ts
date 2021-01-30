const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');

const fs = require('fs');
import { FlightOffer } from "./types";


(async () => {
  // const browser = await puppeteer.launch({
  //               headless: false,
  //               executablePath: "/usr/bin/google-chrome-stable",
  //               args: ['--no-xshm',
  //               '--disable-dev-shm-usage',
  //               '--single-process',
  //               '--window-size=1920,1080', '--start-maximized']
  //           });

  const width = 1920 + Math.floor(Math.random() * 100);
  const height = 1080 + Math.floor(Math.random() * 100);

  const options = [];
  //puppeteer.use(pluginStealth());
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [`--window-size=${width},${height}`, ...options]
  });

  const page = await browser.newPage();

  await page.setRequestInterception(true);
  //  await page.setReponseInterception(true);

  page.on('request', async (request) => {
    const url = request.url();
    request.continue();
    // }
  });

  page.on('response', async response => {
    if (response.url().includes("graphql")) {

      if (response.status() == 200) {

        const text = await response.text();
        if (text.includes("itineraries")) {
          console.log("graphql found");
          fs.writeFileSync('test.txt', text);
          const json = JSON.parse(text);

          getFlightsGraphSQL(json);
        }
      }

    }
    else if (response.url().includes("data")) {
      if (response.status() == 200) {
        const text = await response.text();
        if (text.includes("segItems")) {
          console.log("data found");

          const json = JSON.parse(text);

          getFlightsData(json)
        }
        //console.log(text);
      }
    }

    // do something here
  });

  await page.goto('https://www.opodo.de/travel/#results/type=O;from=PAR;to=FRA;dep=2021-05-01;direct=true;buyPath=FLIGHTS_HOME_SEARCH_FORM;internalSearch=true');
  const title = await page.title();

  //await browser.close();
})();


 const text = JSON.parse(fs.readFileSync('test.txt'));

 getFlightsGraphSQL (text);


function getFlightsData(json) {

  const flightOffers = [];
  console.log("found " + json.items.length + " items");
  for (const item of json.items) {
    //console.log(JSON.stringify(item.itineraryGroupsList[0].segItems[0]));

    // console.log("Found " + json.itineraryGroupsList.length + " group list items");
    const segItem = item.itineraryGroupsList[0].segItems[0];

    for (const segItem of item.itineraryGroupsList[0].segItems) {
      const flightOffer = new FlightOffer();

      flightOffer.price = item.priceWithoutDiscounts.replace(/(<([^>]+)>)/gi, "").replace("&euro;", '').trim();
      flightOffer.origin = segItem.departureInfo.iata;
      flightOffer.destination = segItem.arrivalInfo.iata;
      flightOffer.departureTime = segItem.departureInfo.time;
      flightOffer.arrivalTime = segItem.arrivalInfo.time;
      flightOffer.airline = item.itineraryGroupsList[0].carrierName;

      if (item.itineraryGroupsList.length == 1) {
        flightOffers.push(flightOffer);
        console.log(flightOffer);
      }

    }


  }


  // items[0]
  // .priceWithoutDiscounts
  // .itineraryGroupsList[0]
  // 	.carrierName
  // 	segItems[0]
  // 		departureInfo.iata
  // 		departureInfo.time
  // 		departureInfo.jsFormattedDate
  // 		arrivalInfo.iata
  // 		arr
}

function getFlightsGraphSQL(json) {

  const flightOffers = [];

  for (const itin of json.data.search.itineraries) {
    const flightOffer = new FlightOffer();
    flightOffer.price = itin.fees[0].price.amount;

    const section = itin.legs[0].segments[0].sections[0];
    const depDate = new Date( section.departureDate);

    flightOffer.departureTime = depDate.getHours() +":" + depDate.getMinutes();
    const arrDate = new Date( section.arrivalDate);

    flightOffer.arrivalTime = arrDate.getHours() +":" + arrDate.getMinutes();;
    flightOffer.origin = section.departure.iata;
    flightOffer.destination = section.destination.iata;
    flightOffer.airline = section.carrier.name;


   if (itin.legs[0].segments[0].sections.length == 1) {
     flightOffers.push(flightOffer);

      console.log(flightOffer);
   }
  }

  // graphql

  // data.search.itineraries[0]

  //   .fees[0].price.amount
  //   .legs[0].segments[0]

  //     sections[0!]
  //       departureDate
  //       arrivalDate

  //       departure.iata =  CDG
  //       departure.citylata = PAR
  //       destination.iata = FRA
  //       destination.citylata = FRA
  //       carrier.name

}