import { BookingWebScraper } from './booking/BookingWebScraper';
import { BookingAppScraper } from './booking/BookingAppScraper';
import { AirFranceWebScraper } from './airfrance/AirFranceWebScraper';
import { AirFranceAppScraper } from './airfrance/AirFranceAppScraper';
import { EuroWingsWebScraper } from './eurowings/EuroWingsWebScraper';
import { EuroWingsAppScraper } from './eurowings/EuroWingsAppScraper';
import { ExpediaWebScraper } from './expedia/ExpediaWebScraper';
import { ExpediaAppScraper } from './expedia/ExpediaAppScraper';
import { KayakWebScraper } from './kayak/KayakWebScraper';
import { KayakAppScraper } from './kayak/KayakAppScraper';
import { OpodoWebScraper } from './opodo/OpodoWebScraper';
import { OpodoAppScraper } from './opodo/OpodoAppScraper';

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
  OpodoAppScraper
];