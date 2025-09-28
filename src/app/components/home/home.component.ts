import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { ServicesService } from "../../services/services.service";
import { BookingService } from "../../services/booking.service";
import { Service, BookingFormData } from "../../models/booking.model";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./home.component.html",
  styleUrls: ["./home.component.scss"],
})
export class HomeComponent implements OnInit {
  services: Service[] = [];
  selectedService: Service | null = null;
  showBookingModal = false;
  showSuccessModal = false;
  isSubmitting = false;
  today = new Date().toISOString().split("T")[0];

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

    this.isSubmitting = true;
    try {
      await this.bookingService.createBooking(this.bookingFormData);
      this.closeBookingModal();
      this.showSuccessModal = true;
    } catch (error) {
      console.error("Error submitting booking:", error);
      alert("There was an error submitting your booking. Please try again.");
    } finally {
      this.isSubmitting = false;
    }
  }
}
