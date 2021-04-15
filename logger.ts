/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-25 15:21:23
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-04-15 20:33:43
 * @ Description:
 */



import winston from 'winston';
const ecsFormat = require('@elastic/ecs-winston-format');
require('dotenv').config();
var path = require('path');

const logger = winston.createLogger({
    level: "debug",
    format: ecsFormat(),
    transports: [
        new winston.transports.File({ filename: path.join('.', 'logs', 'scraper.log') }),
    ]
})


logger.add(new winston.transports.Console({
    // format: winston.format.simple(),
    level: 'info',
    format: ecsFormat()
}));


export { logger };