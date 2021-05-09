/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-25 14:52:17
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-05-09 22:53:26
 * @ Description:
 */


var Client = require('ftp');
const fs = require('fs')
var path = require('path');
require('dotenv').config();

const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
import { logger } from "./logger";

export async function uploadJsonToFTP(){
    logger.info(`Going to upload json to ftp...`);
    try {
        logger.info("Uploading jsons...")
        const uploadFiles = [];
        fs.readdirSync('./json/').forEach(async fileName => {
            const compressedFile = path.join(__dirname, 'json', fileName);
            uploadFiles.push({ path: compressedFile, fileName: fileName });
        });

        var c = new Client();
        c.on('ready', function () {
            for (const f of uploadFiles) {
                logger.info("Uploading file " + f.path + " to https://scraperbox.be/screenshots/" + f.fileName);

                c.put(f.path, f.fileName, function (err) {
                    if (err) throw err;
                    logger.info("File uploaded: " + f.fileName);
                   fs.unlinkSync(f.path);
                    c.end();
                });
            }
        });
        c.connect({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            secure: true,
            secureOptions: {
                rejectUnauthorized: false
            }
        });

    }
    catch (err) {
        logger.error(err);
    }

}
export async function uploadScreenshotsToFTP() {

    logger.info(`Going to upload screenshots to ftp...`);
    try {
        logger.info("Compressing screenshots...");
        const files = await imagemin(['screenshots/*.*'], {
            destination: './compressedScreenshots/',
            plugins: [
                imageminPngquant({
                    quality: [0.6, 0.8]
                })
            ]
        });

        for (var file of files) {
            logger.info(`Compressed screenshot from ${JSON.stringify(file.sourcePath)}  into ${JSON.stringify(file.destinationPath)} `);
        }

        logger.info("Removing uncompressed screenshots ...");
        fs.readdirSync('./screenshots/').forEach(async screenshotFile => {
            fs.unlinkSync(path.join('./screenshots/', screenshotFile));
        });

        logger.info("Uploading compressed screenshots...")
        const uploadFiles = [];
        fs.readdirSync('./compressedScreenshots/').forEach(async fileName => {
            const compressedFile = path.join(__dirname, 'compressedScreenshots', fileName);
            uploadFiles.push({ path: compressedFile, fileName: fileName });
        });

        var c = new Client();
        c.on('ready', function () {
            for (const f of uploadFiles) {
                logger.info("Uploading file " + f.path + " to https://scraperbox.be/screenshots/" + f.fileName);

                c.put(f.path, f.fileName, function (err) {
                    if (err) throw err;
                    logger.info("File uploaded: " + f.fileName);
                    fs.unlinkSync(f.path);
                    c.end();
                });
            }
        });
        c.connect({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASS,
            secure: true,
            secureOptions: {
                rejectUnauthorized: false
            }
        });

    }
    catch (err) {
        logger.error(err);
    }
}


