/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-25 15:21:23
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-04-30 14:05:19
 * @ Description:
 */



import winston from 'winston';
const ecsFormat = require('@elastic/ecs-winston-format');
const yn = require('yn');
require('dotenv').config();
var path = require('path');

const logger = winston.createLogger({
    level: 'info',
    format: ecsFormat(),
    transports: [
        new winston.transports.Console()
    ]
})

if (yn(process.env.LOG_TO_FILE)) {
    logger.add(new winston.transports.File({
        filename: path.join('.', 'logs', 'scraper.log')
    }));
  }

export { logger };