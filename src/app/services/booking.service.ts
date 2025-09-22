import { Injectable } from "@angular/core";
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
} from "@angular/fire/firestore";
import { Observable } from "rxjs";
import { Booking, BookingFormData } from "../models/booking.model";

@Injectable({
  providedIn: "root",
})
export class BookingService {
  private readonly bookingsCollection = "bookings";

  constructor(private firestore: Firestore) {}

  createBooking(bookingData: BookingFormData): Promise<string> {
    const booking: Omit<Booking, "id"> = {
      ...bookingData,
      bookingDate: new Date(bookingData.bookingDate),
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return addDoc(
      collection(this.firestore, this.bookingsCollection),
      booking
    ).then((docRef) => docRef.id);
  }

  getBookings(): Observable<Booking[]> {
    const bookingsRef = collection(this.firestore, this.bookingsCollection);
    const q = query(bookingsRef, orderBy("createdAt", "desc"));
    return collectionData(q, { idField: "id" }) as Observable<Booking[]>;
  }

  getBookingsByStatus(status: string): Observable<Booking[]> {
    const bookingsRef = collection(this.firestore, this.bookingsCollection);
    const q = query(
      bookingsRef,
      where("status", "==", status),
      orderBy("createdAt", "desc")
    );
    return collectionData(q, { idField: "id" }) as Observable<Booking[]>;
  }

  updateBookingStatus(bookingId: string, status: string): Promise<void> {
    const bookingRef = doc(this.firestore, this.bookingsCollection, bookingId);
    return updateDoc(bookingRef, {
      status,
      updatedAt: new Date(),
      ...(status === "confirmed" && { paidAt: new Date() }),
    });
  }

  updateBookingPaymentLink(
    bookingId: string,
    paymentLink: string
  ): Promise<void> {
    const bookingRef = doc(this.firestore, this.bookingsCollection, bookingId);
    return updateDoc(bookingRef, {
      paymentLink,
      status: "pending_payment",
      updatedAt: new Date(),
    });
  }
}
