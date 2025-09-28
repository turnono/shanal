export interface Booking {
  id?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  serviceName: string;
  bookingDate: Date;
  notes?: string;
  status: BookingStatus;
  userId?: string;
  paidAt?: Date;
  ownerNotifiedAt?: Date;
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
  bookingDate: string;
  notes?: string;
}
