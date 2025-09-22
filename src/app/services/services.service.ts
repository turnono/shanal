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
        "Explore Mauritius at your own pace with our reliable car rental service. Perfect for families and groups.",
      price: 45,
      duration: "Per day",
      features: [
        "Full insurance coverage",
        "24/7 roadside assistance",
        "GPS navigation included",
        "Unlimited mileage",
        "Free airport pickup/drop-off",
      ],
    },
    {
      id: "sightseeing-tour",
      name: "Sightseeing Tour",
      description:
        "Discover the beauty of Mauritius with our guided sightseeing tours to the most iconic locations.",
      price: 65,
      duration: "Full day (8 hours)",
      features: [
        "Professional guide",
        "Visit 5+ attractions",
        "Lunch included",
        "Hotel pickup/drop-off",
        "Small group tours (max 8 people)",
      ],
    },
    {
      id: "catamaran-trip",
      name: "Catamaran Trip",
      description:
        "Experience the crystal-clear waters of Mauritius with our luxury catamaran trips.",
      price: 85,
      duration: "Full day (6 hours)",
      features: [
        "Luxury catamaran",
        "Snorkeling equipment",
        "BBQ lunch on board",
        "Open bar (alcoholic & non-alcoholic)",
        "Visit to private beaches",
      ],
    },
    {
      id: "ile-aux-cerfs",
      name: "Ile Aux Cerfs Island Trip",
      description:
        "Visit the famous Ile Aux Cerfs island with its pristine beaches and water activities.",
      price: 75,
      duration: "Full day (7 hours)",
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
        "Comfortable and reliable airport transfer service to and from your hotel.",
      price: 25,
      duration: "One way",
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
