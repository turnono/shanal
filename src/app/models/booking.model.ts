export interface Booking {
  id?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  serviceName: string;
  bookingDate?: Date; // for single‑day services
  rentalStart?: Date; // car rental start
  rentalEnd?: Date; // car rental end
  notes?: string;
  status: BookingStatus;
  userId?: string;
  paidAt?: Date;
  ownerNotifiedAt?: Date;
  customerNotifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration?: string;
  imageUrl?: string;
  features: string[];
}

export interface BookingFormData {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  serviceName: string;
  bookingDate: string; // yyyy‑mm‑dd for single‑day services
  startDate?: string; // yyyy‑mm‑dd for car rental
  endDate?: string; // yyyy‑mm‑dd for car rental
  notes?: string;
}
