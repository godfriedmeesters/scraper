import scrapers from './index'

export class ScraperList {
    static getItems() {
      return scrapers.map(scraper => (console.log(new scraper())));
    }
  }