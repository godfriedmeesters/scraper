var path = require('path');
require('dotenv').config();
var Queue = require('bull');
import { logger } from './logger';
import scraperClasses from './index';

const options = {
    redis: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        password: process.env.DB_PASS,
    },
}

const scraperCommandQueue = new Queue('scraperCommands', options);
const finishedScrapeQueue = new Queue('finishedScrapes', options);
const erroredScrapeQueue = new Queue('erroredScrapes', options);

logger.info("Starting to wait for scraping jobs");
scraperCommandQueue.process((job, done) => {
    logger.info(`Got new scraper job: ${job.data.scraperClass} with params:  ${JSON.stringify(job.data.params)} and input data
    ${JSON.stringify(job.data.inputData)} `);

    (async () => {
        let scraperClass = scraperClasses.find(scraper => scraper.name === job.data.scraperClass);


        const scraper = new scraperClass();

        if ("language" in job.data.params) {
            await scraper.startClient(job.data.params.language);
        }
        else {
            await scraper.startClient();
        }

        try {
            let offers: any = [{ 'price': '444' }, { 'price': '555' }];

            const startTime = new Date();
            if (!JSON.parse(job.data.params.useTestData || false)) {
                logger.info(`${job.data.scraperClass}:Entering input data...`)
                await scraper.scrapeUntilSearch(job.data.inputData);
                logger.info(`${job.data.scraperClass}:Launching search...`)
                offers = await scraper.scrapeFromSearch(job.data.inputData);
                await scraper.transferScreenshotsToFtp();
            }

            const stopTime = new Date();
            const finishedJob = { ...job.data, "items": offers, startTime, stopTime };

            console.log(JSON.stringify(offers));
            logger.info(`Finished scraper job`);

            await finishedScrapeQueue.add(finishedJob);

        }
        catch (exception) {
            logger.error(`Error when scraping ${job.data.scraperClass}: ${exception}`);
            await erroredScrapeQueue.add({
                ...job.data,
                "errors": JSON.stringify(exception)
            });
        }
        finally {
            done();
            await scraper.stopClient();
        }
    })();
});

process.on("SIGINT", function () {
    console.log("\ngracefully shutting down from SIGINT (Crtl-C)");
    (async () => {
        (async () => {
            try {
                await scraperCommandQueue.close(1000);
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