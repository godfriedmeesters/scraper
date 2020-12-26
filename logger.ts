import winston from 'winston';
const ecsFormat = require('@elastic/ecs-winston-format');
require('dotenv').config();
var path = require('path');

export const logger = winston.createLogger({
    level: process.env.LOG_LEVEL,
    format: ecsFormat(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename:  path.join('.', 'logs' , 'scraper.log') }),
    ]
})