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
import { deleteField } from "firebase/firestore";
import { Observable } from "rxjs";
import { Booking, BookingFormData, BookingStatus } from "../models/booking.model";

@Injectable({
  providedIn: "root",
})
export class BookingService {
  private readonly bookingsCollection = "bookings";

  constructor(private firestore: Firestore) {}

  createBooking(bookingData: BookingFormData): Promise<string> {
    const booking: Omit<Booking, "id"> = {
      ...bookingData,
      customerEmail: bookingData.customerEmail?.trim() || undefined,
      bookingDate: new Date(bookingData.bookingDate),
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return addDoc(collection(this.firestore, this.bookingsCollection), booking)
      .then((docRef) => docRef.id)
      .catch((error) => {
        console.error("Error creating booking:", error);
        throw error;
      });
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

  updateBookingStatus(bookingId: string, status: BookingStatus): Promise<void> {
    const bookingRef = doc(this.firestore, this.bookingsCollection, bookingId);
    return updateDoc(bookingRef, {
      status,
      updatedAt: new Date(),
      ...(status === "confirmed"
        ? { paidAt: new Date() }
        : { paidAt: deleteField() }),
    });
  }
}
