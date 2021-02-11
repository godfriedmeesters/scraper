require('dotenv').config();
var Queue = require('bull');
import { logger } from './logger';
import { sleep } from './util';
import scraperClasses from './index';
const yn = require('yn');
const redis = require("redis");


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

    //TODO: wait max 5 min
    let scraperClass = scraperClasses.find(scraper => scraper.name === job.data.scraperClass);

    const scraper = new scraperClass();

    logger.info(`Procesing job ${JSON.stringify(job)}`);
    try {

        logger.info("Starting job with params " + JSON.stringify(job.data.params));

        await scraper.startClient(job.data.params);

        let offers: any;

        const startTime = new Date();
        logger.info(`${job.data.scraperClass}:Entering input data...`)

        const timeoutPromise = new Promise((resolve, reject) => {
            setTimeout(resolve, 1000 * 300, 'timeout');   //timeout of 300 seconds
        });

        var timeoutResult = await Promise.race([timeoutPromise, scraper.scrapeUntilSearch(job.data.inputData)]);
        if (timeoutResult == "timeout")
            logger.error("Timeout for scrapeUntilSearch after 300 seconds");
        else
            logger.info("scrapUntilSearch finished on time (< 300 seconds)");

        if ("comparisonRunId" in job.data && "comparisonSize" in job.data) {
            // synchronize with other scraper machines
            logger.info(`Synchronzing with ${job.data.comparisonSize} other scrapers in comparisonRunId ${job.data.commparisonRunId}`);

            const redisClient = redis.createClient({
                "host": process.env.DB_HOST,
                "password": process.env.DB_PASS
            });

            redisClient.on("error", function (error) {
                console.error(error);
            });

            logger.info("Incrementing counter for " + job.data.comparisonRunId);
            redisClient.incr(parseInt(job.data.comparisonRunId));

            var synchronizationPeriodSeconds = 0;
            var stop = false;

            logger.info(`Synchronizing, wait for a maxium of ${process.env.SYNCHRONIZATION_SECONDS}`);
            while (!stop) {
                redisClient.get(parseInt(job.data.comparisonRunId), function (err, reply) {
                    if (reply >= job.data.comparisonSize) {
                        logger.info(` nr of scrapeTillSearchFinished ${reply} == comparisonSize  ${job.data.comparisonSize}, going to click on the search button...`);
                        stop = true;
                    }
                    else {
                        logger.info(` nr of scrapeTillSearchFinished ${reply} <> comparisonSize  ${job.data.comparisonSize}`);
                    }
                });


                await sleep(1000);

                synchronizationPeriodSeconds++;

                logger.info(`${job.data.scraperClass}: Syncronized for ${synchronizationPeriodSeconds} seconds`);

                if (synchronizationPeriodSeconds >= parseInt(process.env.SYNCHRONIZATION_SECONDS))
                    break;
            }

            redisClient.quit();
            // synchronized
        }
        else {
            logger.info("Not using synchronization.");
        }

        logger.info(`${job.data.scraperClass}:Clicking search button...`)
        timeoutResult = await Promise.race([timeoutPromise, scraper.scrapeFromSearch(job.data.inputData)]);
        if (timeoutResult == "timeout")
            logger.error("Timeout for scrapeFromSearch after 300 seconds");
        else
            logger.info(`${job.data.scraperClass}: ScrapeFromSearch finished on time (< 300 seconds)`);

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


