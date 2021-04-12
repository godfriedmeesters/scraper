/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-17 15:18:28
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-04-12 11:56:26
 * @ Description:
 */


require('dotenv').config();
var Queue = require('bull');
import { logger } from './logger';
import { sleep } from './util';
import scraperClasses from './index';
const yn = require('yn');
const redis = require("redis");
const { promisify } = require("util");

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

logger.info("Starting to wait for scraping jobs");

if (yn(process.env.PULL_WEB_BROWSER_QUEUE)) {
    webScraperCommands.process((job, done) => {
        logger.info(`Got new scraper job on web browser queue: ${job.data.scraperClass} with params:  ${JSON.stringify(job.data.params)} and input data
    ${JSON.stringify(job.data.inputData)} `);

        const inputData = JSON.parse(
            fs.readFileSync("proxies.json")
        );

        const proxies = inputData.proxies;

        var use_proxy = Math.random() < 0.8;


        const proxy_index = Math.floor(Math.random() * proxies.length);

        if (use_proxy) {
            job.data.params.proxy = proxies[proxy_index];
            logger.info("Selected proxy " + proxies[proxy_index]);
        }

        (async () => {
            try {
                await processScraperJob(job, done);
            } catch (ex) {
                logger.error(`FATAL error when processing job ${JSON.stringify(job)}: ${ex.stack}`)

            }
        })();
    });
}

if (yn(process.env.PULL_REAL_DEVICE_QUEUE)) {
    realDeviceScraperCommands.process((job, done) => {
        logger.info(`Got new scraper job on real device queue: ${job.data.scraperClass} with params:  ${JSON.stringify(job.data.params)} and input data
    ${JSON.stringify(job.data.inputData)} `);

        (async () => {
            try {
                await processScraperJob(job, done);
            } catch (ex) {
                logger.error(`FATAL error when processing job ${JSON.stringify(job)}: ${ex.stack}`)

            }
        })();
    });
}

if (yn(process.env.PULL_EMULATOR_QUEUE)) {
    emulatedDeviceScraperCommands.process((job, done) => {
        logger.info(`Got new scraper job on emulated device queue: ${job.data.scraperClass} with params:  ${JSON.stringify(job.data.params)} and input data
    ${JSON.stringify(job.data.inputData)} `);

        (async () => {
            try {
                await processScraperJob(job, done);
            } catch (ex) {
                logger.error(`FATAL error when processing job ${JSON.stringify(job)}: ${ex.stack}`)

            }
        })();
    });
}

async function processScraperJob(job, done) {
    let scraperClass = scraperClasses.find(scraper => scraper.name === job.data.scraperClass);

    const scraper = new scraperClass();

    const hostName = os.hostname();

    logger.info(`${job.data.scraperClass}: Scraper reveived new job ${JSON.stringify(job)}`);

    const redisClient = redis.createClient({
        "host": process.env.DB_HOST,
        "password": process.env.DB_PASS
    });

    const incAsync = promisify(redisClient.incr).bind(redisClient);
    const getAsync = promisify(redisClient.get).bind(redisClient);


    redisClient.on("error", function (error) {
        logger.error(error);
    });


    try {
        const startedCountKey =  job.data.comparisonRunId + "Started";
        logger.info(`${job.data.scraperClass} on ${hostName}: Incrementing ${startedCountKey}`)

        var startedCount = 0;

        const lock = promisify(require('redis-lock')(redisClient));

        //test
        const test = await incAsync( job.data.comparisonRunId );
        logger.info(`${job.data.scraperClass} on ${hostName} test: ${test}`);





        logger.info(`${job.data.scraperClass} on ${hostName}: Getting lock on  ${startedCountKey}.`);
        const unlockOnStart = await lock('lockOnStart', 5000);
        logger.info(`${job.data.scraperClass} on ${hostName}: Locked on  ${startedCountKey}.`);
        logger.info(`${job.data.scraperClass} on ${hostName}: Incrementing  ${startedCountKey}.`);
        startedCount = await incAsync(startedCountKey);
        await unlockOnStart();
        logger.info(`${job.data.scraperClass} on ${hostName}:  ${startedCountKey} is now ${startedCount}.`);


        var synchronizationOnStartSeconds = 0;

        var stopWaitingForAllStarted = false;

        while (!stopWaitingForAllStarted) {

            startedCount = await getAsync(startedCountKey);

            if (startedCount >= job.data.comparisonSize) {
                logger.info(`${job.data.scraperClass} on ${hostName}: Nr of Scraper Runs started ${startedCount} >= comparisonSize  ${job.data.comparisonSize}, going to scrape until search...`);
                stopWaitingForAllStarted = true;
            }
            else {
                if (synchronizationOnStartSeconds % 5 == 0)
                {
                    logger.info(`${job.data.scraperClass} on ${hostName}: Nr of Scraper Runs started ${startedCount} <> comparisonSize  ${job.data.comparisonSize}`);
                    const testGet = await getAsync( job.data.comparisonRunId );
                    logger.info(`${job.data.scraperClass} on ${hostName} test: ${testGet}`);
                }
                }

            const erroredCount = await getAsync("comparison_" + parseInt(job.data.comparisonRunId) + "_errored_count");

            if (erroredCount >= 1) {
                logger.info(`Nr of Scraper Runs in comparison run ${job.data.comparisonRunId} with error >= 1, going to quit scraper run`);
                throw new Error(`FATAL ERROR: one or more scraper runs in comparison run ${job.data.comparisonRunId} errored, terminated current scraper run.`);
            }


            if (stopWaitingForAllStarted)
                break;


            await sleep(1000);  // wait one second

            synchronizationOnStartSeconds++;


            if (synchronizationOnStartSeconds > parseInt(process.env.MAX_SYNCHRONIZATION_SECONDS))   // after waiting max seconds for other scrapers to start, throw error
            {
                throw new Error(`${job.data.scraperClass}: FATAL ERROR: synchronizationOnStartSeconds > ${parseInt(process.env.MAX_SYNCHRONIZATION_SECONDS)}`);

            }
        }

        logger.info(`${job.data.scraperClass}: Starting job ${JSON.stringify(job)}`);
        await scraper.startClient(job.data.params);

        // after other scraper runs in comparison are ready, start scraping

        const startTime = new Date();
        logger.info(`${job.data.scraperClass}:Entering input data...`);

        const timeoutSecondsBeforeSearch = parseInt(process.env.TIMEOUT_SECONDS_BEFORE_SEARCH);

        //wait maximum timeoutSeconds for current scraping job to finish before search
        const timeoutPromiseBeforeSearch = new Promise((resolve, reject) => {
            setTimeout(resolve, 1000 * timeoutSecondsBeforeSearch, 'timeout');
        });

        var raceResult = await Promise.race([timeoutPromiseBeforeSearch, scraper.scrapeUntilSearch(job.data.inputData)]);

        if (raceResult == "timeout") {
            const errorMessage = `${job.data.scraperClass}:  scrapeUntilSearch Timeout`;
            throw new Error(errorMessage);
        }
        else
            logger.info(`${job.data.scraperClass}: scrapUntilSearch finished on time (< ${timeoutSecondsBeforeSearch} seconds)`);

        logger.info(`${job.data.scraperClass}: Synchronizing with ${job.data.comparisonSize}  scraper runs of comparisonRunId ${job.data.comparisonRunId}`);

        const reachedSearchCountKey = "comparison_" + parseInt(job.data.comparisonRunId) + "_reached_search_count";

        logger.info(`${job.data.scraperClass} on ${hostName}: Incrementing  ${reachedSearchCountKey}.`);


        var reachedSearchCount = 0;


        logger.info(`${job.data.scraperClass} on ${hostName}: Getting lock on  ${reachedSearchCountKey}.`);
        const unlockOnSearch = await lock('lockOnSearch', 50000);
        logger.info(`${job.data.scraperClass} on ${hostName}: Locked on  ${reachedSearchCountKey}.`);
        logger.info(`${job.data.scraperClass} on ${hostName}: Incrementing  ${reachedSearchCountKey}.`);
        reachedSearchCount = await incAsync(startedCountKey);
        logger.info(`${job.data.scraperClass} on ${hostName}:  ${reachedSearchCountKey} is now ${reachedSearchCount}.`);

        await unlockOnSearch();
        logger.info(`${job.data.scraperClass} on ${hostName}: Unlocked  ${reachedSearchCountKey}.`);

        var synchronizationOnSearchSeconds = 0;
        var stopWaitingForAllReachedSearch = false;

        logger.info(`${job.data.scraperClass}: Synchronizing on search with other scraper runs ...`);
        while (!stopWaitingForAllReachedSearch) {
            reachedSearchCount = await getAsync(reachedSearchCountKey);

            if (reachedSearchCount >= job.data.comparisonSize) {
                logger.info(`${job.data.scraperClass} on ${hostName}: Nr of Scraper Runs with scrapeTillSearchFinished ${reachedSearchCount} == comparisonSize  ${job.data.comparisonSize}, going to click on the search button...`);
                stopWaitingForAllReachedSearch = true;
            }
            else {
                if (synchronizationOnSearchSeconds % 5 == 0)
                    logger.info(`${job.data.scraperClass} on ${hostName}: Nr of Scraper Runs with  scrapeTillSearchFinished ${reachedSearchCount} <> comparisonSize  ${job.data.comparisonSize}`);
            }

            if (stopWaitingForAllReachedSearch)
                break;

            const erroredCount = await getAsync("comparison_" + parseInt(job.data.comparisonRunId) + "_errored_count");

            if (erroredCount >= 1) {
                logger.info(`Nr of Scraper Runs in comparison run ${job.data.comparisonRunId} with error >= 1, going to quit scraper run`);
                throw new Error(`FATAL ERROR: one or more scraper runs in comparison run ${job.data.comparisonRunId} errored, terminated current scraper run.`);
            }


            await sleep(1000);  // wait one second

            synchronizationOnSearchSeconds++;


            if (synchronizationOnSearchSeconds > parseInt(process.env.MAX_SYNCHRONIZATION_SECONDS))   // after waiting max seconds for other scrapers, throw error
            {
                throw new Error(`FATAL ERROR: synchronizationOnSearchSeconds > ${parseInt(process.env.MAX_SYNCHRONIZATION_SECONDS)}`);
            }
        }

        const timeoutSecondsAfterSearch = parseInt(process.env.TIMEOUT_SECONDS_AFTER_SEARCH);

        const timeoutPromiseAfterSearch = new Promise((resolve, reject) => {
            setTimeout(resolve, 1000 * timeoutSecondsAfterSearch, 'timeout');
        });

        logger.info(`${job.data.scraperClass}:Clicking search button...`)

        let offers: any;
        raceResult = await Promise.race([timeoutPromiseAfterSearch, scraper.scrapeFromSearch(job.data.inputData)]);
        if (raceResult == "timeout") {
            const errorMessage = `${job.data.scraperClass}:  scrapeFromSearch took longer than ${timeoutSecondsAfterSearch} seconds`;
            throw new Error(errorMessage);
        }
        else {
            logger.info(`${job.data.scraperClass}: ScrapeFromSearch finished on time (< ${timeoutSecondsAfterSearch} seconds)`);
            offers = raceResult;
        }

        const stopTime = new Date();

        // add index to every offer
        if (!('sortedByBest' in offers && 'sortedByCheapest' in offers)) {
            for (var i = 0; i < offers.length; i++) {
                offers[i].index = i;
            }
        }
        else {
            for (var i = 0; i < offers.sortedByBest.length; i++) {
                offers.sortedByBest[i].index = i;
            }

            for (var i = 0; i < offers.sortedByCheapest.length; i++) {
                offers.sortedByCheapest[i].index = i;
            }
        }

        const finishedJob = { ...job.data, "items": offers, startTime, stopTime, hostName };

        logger.info(`Finished scraper job sucessfully, found ${offers.length} offers`);

        await finishedScrapeQueue.add(finishedJob);


        done();
    }
    catch (exception) {

        var errorMessage = "";
        try {

            redisClient.incr("comparison_" + parseInt(job.data.comparisonRunId) + "_errored");

            errorMessage = `Error when scraping ${job.data.scraperClass} on ${hostName}: ${exception.stack}`;
            logger.error(errorMessage);
            const screenshotAtError = await scraper.takeScreenShot(job.data.scraperClass);
            //split error message, because taking screenshot can crash
            errorMessage += ', screenshot available at ' + screenshotAtError
            logger.error(errorMessage);

            await erroredScrapeQueue.add({
                ...job.data,
                "errors": errorMessage
            });

        }
        catch (ex) {
            errorMessage = `Exception when taking screenshot after error:  ${ex.stack} on ${hostName}  `;
            logger.error(errorMessage)
            await erroredScrapeQueue.add({
                ...job.data,
                "errors": errorMessage
            });
        }

        done(new Error(String(exception)));
    }
    finally {

        await scraper.transferScreenshotsToFtp();

        await scraper.stopClient(job.data.params);
        // redisClient.quit();

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


