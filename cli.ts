/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-01-22 10:14:13
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-01-28 12:24:06
 * @ Description: CLI for local testing, jobs are not sent to queue but processed locally
 */

var path = require('path');
require('dotenv').config();
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
var fs = require('fs');
import scraperClasses from './index';

yargs(hideBin(process.argv))
  .command('scrape [scraperClass] [inputDataFile]', 'scrape using one class', (yargs) => {
    yargs
      .positional('scraperClass', {
        describe: 'class to use for scraping',
        default: 'AirFranceWebScraper'
      })
      .positional('inputDataFile', {
        describe: 'class to use for scraping',
        default: 'inputData.json'
      })
      .option('language', {
        alias: 'lang',
        type: 'string',
        default: "de",
        description: 'Language for browser: de or fr'
      })
      .option('useCookies', {
        alias: 'useCookies',
        type: 'boolean',
        default: false,
        description: 'Load Chrome profile with cookies'
      })

  }, (argv) => {

    const inputData = JSON.parse(
      fs.readFileSync(argv.inputDataFile)
    );

    const job = {
      "jobCreationTime": new Date(),
      scraperClass: argv.scraperClass, inputData,
      params: { "useCookies": argv.useCookies, 'language': argv.language }
    };

    console.log(`Executing new job ${JSON.stringify(job)}`);
    (async () => {
      await processScraperJob(job);
    })();
  })
  .argv

async function processScraperJob(job) {
  let scraperClass = scraperClasses.find(scraper => scraper.name === job.scraperClass);

  const scraper = new scraperClass();

  console.log(`Procesing job ${JSON.stringify(job)}`);
  try {

    await scraper.startClient(job.params);


    let offers: any = [{ 'price': '444' }, { 'price': '555' }];


    console.log(`${job.scraperClass}:Entering input data...`)
    await scraper.scrapeUntilSearch(job.inputData);
    console.log(`${job.scraperClass}:Clicking search button...`)
    offers = await scraper.scrapeFromSearch(job.inputData);

    console.log(JSON.stringify(offers));
    console.log(`Finished scraper job`);
  }
  catch (exception) {
    console.log(exception);
  }
  finally {
    //await scraper.stopClient();
  }

}



