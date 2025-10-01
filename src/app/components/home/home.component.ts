import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { ServicesService } from "../../services/services.service";
import { AiChatbotComponent } from "../ai-chatbot/ai-chatbot.component";
import { BookingService } from "../../services/booking.service";
import { Service, BookingFormData } from "../../models/booking.model";
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule, AiChatbotComponent],
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
})
export class HomeComponent implements OnInit {
  services: Service[] = [];
  filteredServices: Service[] = [];
  selectedService: Service | null = null;
  showBookingModal = false;
  mobileMenuOpen = false;
  showSuccessModal = false;
  isSubmitting = false;
  today = new Date().toISOString().split("T")[0];
  defaultServiceImage = "assets/service-images/default-service.svg";
  ownerWhatsAppNumber = environment.ownerWhatsAppNumber;
  whatsAppUrl: string | null = null;

  filter: { type: string; maxPrice: number | null } = {
    type: "",
    maxPrice: null,
  };

  bookingFormData: BookingFormData = {
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    serviceName: "",
    bookingDate: "",
    notes: "",
  };

  constructor(
    private servicesService: ServicesService,
    private bookingService: BookingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.services = this.servicesService.getServices();
    this.filteredServices = [...this.services];
  }

  applyFilters() {
    this.filteredServices = this.services.filter((s) => {
      const typeOk = this.filter.type ? s.id === this.filter.type : true;
      const priceOk =
        this.filter.maxPrice != null ? s.price <= this.filter.maxPrice : true;
      return typeOk && priceOk;
    });
  }

  getServiceIcon(serviceId: string): string {
    const icons: { [key: string]: string } = {
      "car-rental": "🚗",
      "sightseeing-tour": "🏝️",
      "catamaran-trip": "⛵",
      "ile-aux-cerfs": "🏖️",
      "airport-transfer": "✈️",
    };
    return icons[serviceId] || "🎯";
  }

  openBookingModal(service: Service) {
    this.selectedService = service;
    this.bookingFormData = {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      serviceName: service.name,
      bookingDate: "",
      notes: "",
    };
    this.showBookingModal = true;
  }

  closeBookingModal() {
    this.showBookingModal = false;
    this.selectedService = null;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  goToAdmin() {
    this.router.navigate(["/admin"]);
  }

  async submitBooking() {
    if (!this.selectedService) return;
    // Basic validation for car rental period
    if (
      this.selectedService.id === "car-rental" &&
      !(this.bookingFormData.startDate && this.bookingFormData.endDate)
    ) {
      alert("Please select both start and end dates for car rental.");
      return;
    }
    if (
      this.selectedService.id === "car-rental" &&
      this.bookingFormData.startDate &&
      this.bookingFormData.endDate &&
      new Date(this.bookingFormData.endDate) <
        new Date(this.bookingFormData.startDate)
    ) {
      alert("End date cannot be before start date.");
      return;
    }

    // For non car-rental services, require a single booking date
    if (
      this.selectedService.id !== "car-rental" &&
      !this.bookingFormData.bookingDate
    ) {
      alert("Please select a booking date.");
      return;
    }

    this.isSubmitting = true;
    try {
      // Open a placeholder window immediately to preserve user gesture
      // so the WhatsApp tab isn't blocked by popup blockers.
      let waWindow: Window | null = null;
      try {
        waWindow = window.open("about:blank", "_blank");
      } catch (_) {}

      // Create booking in Firestore
      const bookingId = await this.bookingService.createBooking(
        this.bookingFormData
      );

      // Build final WhatsApp deep link to notify owner directly
      const text = encodeURIComponent(
        `New booking request\n` +
          `Service: ${this.bookingFormData.serviceName}\n` +
          `Date: ${this.bookingFormData.bookingDate}\n` +
          `Name: ${this.bookingFormData.customerName}\n` +
          `Phone: ${this.bookingFormData.customerPhone}\n` +
          `Email: ${this.bookingFormData.customerEmail || "-"}\n` +
          `Notes: ${this.bookingFormData.notes || "-"}\n` +
          `Booking ID: ${bookingId}`
      );
      const finalUrl = `https://wa.me/${this.ownerWhatsAppNumber}?text=${text}`;
      this.whatsAppUrl = finalUrl;

      // If we managed to pre-open a window, navigate it now; otherwise fallback to button in success modal
      if (waWindow) {
        try {
          waWindow.location.href = finalUrl;
        } catch (_) {
          // Ignore; success modal will show the manual button
        }
      }
      this.closeBookingModal();
      this.showSuccessModal = true;
    } catch (error) {
      console.error("Error submitting booking:", error);
      alert("There was an error submitting your booking. Please try again.");
    } finally {
      this.isSubmitting = false;
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
  }

  // Helpers for car rental pricing
  get isCarRental(): boolean {
    return this.selectedService?.id === "car-rental";
  }

  get rentalDays(): number {
    const { startDate, endDate } = this.bookingFormData;
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const ms = end.getTime() - start.getTime();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1; // inclusive
    return days > 0 ? days : 0;
  }

  get rentalTotal(): number {
    if (!this.isCarRental) return 0;
    const pricePerDay = this.selectedService?.price || 0;
    return this.rentalDays * pricePerDay;
  }

  datesValid(): boolean {
    if (!this.isCarRental) return true;
    const { startDate, endDate } = this.bookingFormData;
    if (!startDate || !endDate) return false;
    return new Date(endDate) >= new Date(startDate);
  }
}
