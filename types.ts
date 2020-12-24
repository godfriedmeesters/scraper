export class FlightOffer {
    departureTime: string;
    arrivalTime: string;
    flightNumber: string;
    origin: string;
    destination: string;
    price: string;
    type:string;//economy, business, smart
    airline: string;
    screenshot: string;
    url: string;
}

export class HotelOffer {
    searchLocation: string;
    checkinDate: string;
    hotelName: string;
    price: string;
    screenshot: string;
    url: string;
}

export class OfferList {
    scraperName: string;
    offers: any;

    constructor(scraperName, offers) {
        this.scraperName = scraperName;
        this.offers = offers;
    }
}