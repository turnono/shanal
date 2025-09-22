export interface Booking {
  id?: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  bookingDate: Date;
  notes?: string;
  status: BookingStatus;
  paymentLink?: string;
  userId?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingStatus =
  | "pending"
  | "pending_payment"
  | "confirmed"
  | "cancelled";

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
  customerPhone: string;
  serviceName: string;
  bookingDate: string;
  notes?: string;
}
