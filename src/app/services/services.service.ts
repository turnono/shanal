import { Injectable } from "@angular/core";
import { Service } from "../models/booking.model";

@Injectable({
  providedIn: "root",
})
export class ServicesService {
  private services: Service[] = [
    {
      id: "car-rental",
      name: "Car Rental",
      description:
        "Explore Mauritius at your own pace with our reliable and affordable car rental service. Perfect for families and groups who want freedom to travel.",
      price: 2500,
      duration: "Per day",
      imageUrl: "assets/service-images/car-rental.svg",
      features: [
        "Comprehensive insurance",
        "24/7 roadside assistance",
        "GPS navigation included",
        "Unlimited mileage",
        "Free delivery to hotels",
      ],
    },
    {
      id: "sightseeing-tour",
      name: "Sightseeing Tour",
      description:
        "Discover Mauritius with our experienced local guide. Visit the most beautiful places including Chamarel, Black River Gorges, and more.",
      price: 3500,
      duration: "Full day (8 hours)",
      imageUrl: "assets/service-images/sightseeing-tour.svg",
      features: [
        "Professional local guide",
        "Visit 4-5 attractions",
        "Lunch included",
        "Hotel pickup/drop-off",
        "Small group tours (max 6 people)",
      ],
    },
    {
      id: "catamaran-trip",
      name: "Catamaran Trip",
      description:
        "Enjoy a relaxing day on the crystal-clear waters of Mauritius. Snorkeling, swimming, and a delicious BBQ lunch on board.",
      price: 4500,
      duration: "Full day (6 hours)",
      imageUrl: "assets/service-images/catamaran-trip.svg",
      features: [
        "Comfortable catamaran",
        "Snorkeling equipment",
        "BBQ lunch on board",
        "Soft drinks included",
        "Visit to beautiful lagoons",
      ],
    },
    {
      id: "ile-aux-cerfs",
      name: "Ile Aux Cerfs Island Trip",
      description:
        "Visit the famous Ile Aux Cerfs island with its pristine white sand beaches and crystal clear waters. Perfect for relaxation and water activities.",
      price: 4000,
      duration: "Full day (7 hours)",
      imageUrl: "assets/service-images/ile-aux-cerfs.svg",
      features: [
        "Boat transfer included",
        "Beach access",
        "Water sports available",
        "Lunch at island restaurant",
        "Return transfer",
      ],
    },
    {
      id: "airport-transfer",
      name: "Airport Transfers",
      description:
        "Comfortable and reliable airport transfer service. We'll pick you up from the airport and take you to your hotel or anywhere in Mauritius.",
      price: 1500,
      duration: "One way",
      imageUrl: "assets/service-images/airport-transfer.svg",
      features: [
        "Meet & greet service",
        "Air-conditioned vehicles",
        "Flight tracking",
        "Luggage assistance",
        "24/7 availability",
      ],
    },
  ];

  getServices(): Service[] {
    return this.services;
  }

  getServiceById(id: string): Service | undefined {
    return this.services.find((service) => service.id === id);
  }
}
