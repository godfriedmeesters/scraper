/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-22 22:33:06
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-05-19 00:12:54
 * @ Description:
 */


import { BookingWebScraper } from './companies/booking/BookingWebScraper';
import { BookingAppScraper } from './companies/booking/BookingAppScraper';
import { AirFranceWebScraper } from './companies/airfrance/AirFranceWebScraper';
import { AirFranceAppScraper } from './companies/airfrance/AirFranceAppScraper';
import { EuroWingsWebScraper } from './companies/eurowings/EuroWingsWebScraper';
import { EuroWingsAppScraper } from './companies/eurowings/EuroWingsAppScraper';
import { ExpediaWebScraper } from './companies/expedia/ExpediaWebScraper';
import { ExpediaAppScraper } from './companies/expedia/ExpediaAppScraper';
import { KayakWebScraper } from './companies/kayak/KayakWebScraper';
import { KayakAppScraper } from './companies/kayak/KayakAppScraper';
import { OpodoWebScraper } from './companies/opodo/OpodoWebScraper';
import { OpodoAppScraper } from './companies/opodo/OpodoAppScraper';
import { KayakMobileBrowserScraper } from './companies/kayak/KayakMobileBrowserScraper';

//index of all scrapers
export default [
  BookingWebScraper,
  BookingAppScraper,
  AirFranceWebScraper,
  AirFranceAppScraper,
  EuroWingsWebScraper,
  EuroWingsAppScraper,
  ExpediaWebScraper,
  ExpediaAppScraper,
  KayakWebScraper,
  KayakAppScraper,
  OpodoWebScraper,
  OpodoAppScraper,
  KayakMobileBrowserScraper
];