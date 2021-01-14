/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-25 15:21:23
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-01-14 17:59:36
 * @ Description:
 */



import winston from 'winston';
const ecsFormat = require('@elastic/ecs-winston-format');
require('dotenv').config();
var path = require('path');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL,
    format: ecsFormat(),
    transports: [
        new winston.transports.File({ filename: path.join('.', 'logs', 'scraper.log') }),
    ]
})


logger.add(new winston.transports.Console({
   // format: winston.format.simple(),
   format:  ecsFormat()
}));


export { logger };