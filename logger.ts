/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-25 15:21:23
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-04-18 22:30:01
 * @ Description:
 */



import winston from 'winston';
const ecsFormat = require('@elastic/ecs-winston-format');
require('dotenv').config();
var path = require('path');

const logger = winston.createLogger({
    level: 'info',
    format: ecsFormat(),
    transports: [
        new winston.transports.Console()
    ]
})

// logger.add(new winston.transports.Console({
//     // format: winston.format.simple(),
//     level: 'info',//
//     format: ecsFormat()
// }));


export { logger };