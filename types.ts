/**
 * @ Author: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Create Time: 2020-11-22 22:33:05
 * @ Modified by: Godfried Meesters <godfriedmeesters@gmail.com>
 * @ Modified time: 2021-02-12 15:26:09
 * @ Description:
 */


export class FlightOffer {
    departureTime: string;
    arrivalTime: string;
    flightNumber: string;
    origin: string;
    destination: string;
    price: string;
    type:string;//economy, business, smart , ...
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
