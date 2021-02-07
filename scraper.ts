require('dotenv').config();
var Queue = require('bull');
import { logger } from './logger';
import scraperClasses from './index';
const yn = require('yn');

const os = require('os');

const options = {
    redis: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        password: process.env.DB_PASS,
    },
}

const emulatedDeviceScraperCommands = new Queue('emulatedDeviceScraperCommands', options);
const realDeviceScraperCommands = new Queue('realDeviceScraperCommands', options);
const webScraperCommands = new Queue('webScraperCommands', options);
var fs = require('fs');

const finishedScrapeQueue = new Queue('finishedScrapes', options);
const erroredScrapeQueue = new Queue('erroredScrapes', options);

logger.info("Starting to wait for scraping jobs V2");

if (yn(process.env.PULL_WEB_BROWSER_QUEUE)) {
    webScraperCommands.process((job, done) => {
        logger.info(`Got new scraper job on web browser queue: ${job.data.scraperClass} with params:  ${JSON.stringify(job.data.params)} and input data
    ${JSON.stringify(job.data.inputData)} `);


        const inputData = JSON.parse(
            fs.readFileSync("proxies.json")
        );

        const proxies = inputData.proxies;

        var use_proxy = Math.random() < 0.4;

        const proxy_index = Math.floor(Math.random() * proxies.length);

        if (use_proxy) {
            job.data.params.proxy = proxies[proxy_index];
            logger.info("Selected proxy " + proxies[proxy_index]);
        }


        (async () => {
            await processScraperJob(job, done);
        })();
    });
}

if (yn(process.env.PULL_REAL_DEVICE_QUEUE)) {
    realDeviceScraperCommands.process((job, done) => {
        logger.info(`Got new scraper job on real device queue: ${job.data.scraperClass} with params:  ${JSON.stringify(job.data.params)} and input data
    ${JSON.stringify(job.data.inputData)} `);

        (async () => {
            await processScraperJob(job, done);
        })();
    });
}

if (yn(process.env.PULL_EMULATOR_QUEUE)) {
    emulatedDeviceScraperCommands.process((job, done) => {
        logger.info(`Got new scraper job on emulated device queue: ${job.data.scraperClass} with params:  ${JSON.stringify(job.data.params)} and input data
    ${JSON.stringify(job.data.inputData)} `);

        (async () => {
            await processScraperJob(job, done);
        })();
    });
}

async function processScraperJob(job, done) {
    let scraperClass = scraperClasses.find(scraper => scraper.name === job.data.scraperClass);

    const scraper = new scraperClass();

    logger.info(`Procesing job ${JSON.stringify(job)}`);
    try {

        logger.info("Starting job with params " + JSON.stringify(job.data.params));
        await scraper.startClient(job.data.params);

        let offers: any = [{ 'price': '444' }, { 'price': '555' }];

        const startTime = new Date();
        if (!JSON.parse(job.data.params.useTestData || false)) {
            logger.info(`${job.data.scraperClass}:Entering input data...`)
            await scraper.scrapeUntilSearch(job.data.inputData);
            logger.info(`${job.data.scraperClass}:Clicking search button...`)
            offers = await scraper.scrapeFromSearch(job.data.inputData);
            await scraper.transferScreenshotsToFtp();
        }

        const stopTime = new Date();

        const hostName = os.hostname();
        const finishedJob = { ...job.data, "items": offers, startTime, stopTime, hostName };

        logger.debug(JSON.stringify(offers));
        logger.info(`Finished scraper job`);

        await finishedScrapeQueue.add(finishedJob);

        done();

    }
    catch (exception) {
        logger.error(`Error when scraping ${job.data.scraperClass}: ${exception}`);
        await erroredScrapeQueue.add({
            ...job.data,
            "errors": String(exception)
        });

        done(new Error(String(exception)));
    }
    finally {
        await scraper.stopClient(job.data.params);
    }
}

process.on("SIGINT", function () {
    console.log("\ngracefully shutting down from SIGINT (Crtl-C)");
    (async () => {
        (async () => {
            try {
                await webScraperCommands.close(1000);
                await finishedScrapeQueue.close(1000);
                await erroredScrapeQueue.close(1000);
            } catch (err) {
                logger.error('bee-queue failed to shut down gracefully', err);
            }
            process.exit(0);

        })();
        logger.info("Queue closed, exiting from CLI"); process.exit();
    })();
});