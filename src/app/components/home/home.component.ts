import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServicesService } from '../../services/services.service';
import { BookingService } from '../../services/booking.service';
import { Service, BookingFormData } from '../../models/booking.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="home-container">
      <!-- Header -->
      <header class="header">
        <div class="container">
          <div class="header-content">
            <div class="logo">
              <h1>Shanal Cars</h1>
              <p>Your Gateway to Mauritius</p>
            </div>
            <nav class="nav">
              <a href="#services" class="nav-link">Services</a>
              <a href="#contact" class="nav-link">Contact</a>
              <button class="admin-btn" (click)="goToAdmin()">Admin</button>
            </nav>
          </div>
        </div>
      </header>

      <!-- Hero Section -->
      <section class="hero">
        <div class="container">
          <div class="hero-content">
            <h2>Discover Mauritius with Shanal Cars</h2>
            <p>Experience the beauty of Mauritius with our premium car rental and tour services. From airport transfers to island adventures, we've got you covered.</p>
            <a href="#services" class="cta-button">Explore Services</a>
          </div>
        </div>
      </section>

      <!-- Services Section -->
      <section id="services" class="services">
        <div class="container">
          <h2 class="section-title">Our Services</h2>
          <div class="services-grid">
            <div *ngFor="let service of services" class="service-card" (click)="openBookingModal(service)">
              <div class="service-image">
                <div class="service-placeholder">
                  <i class="service-icon">{{ getServiceIcon(service.id) }}</i>
                </div>
              </div>
              <div class="service-content">
                <h3>{{ service.name }}</h3>
                <p>{{ service.description }}</p>
                <div class="service-price">
                  <span class="price">${{ service.price }}</span>
                  <span class="duration">{{ service.duration }}</span>
                </div>
                <button class="book-btn">Book Now</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Contact Section -->
      <section id="contact" class="contact">
        <div class="container">
          <h2 class="section-title">Contact Us</h2>
          <div class="contact-info">
            <div class="contact-item">
              <i class="contact-icon">📞</i>
              <div>
                <h4>Phone</h4>
                <p>+230 123 456 789</p>
              </div>
            </div>
            <div class="contact-item">
              <i class="contact-icon">📧</i>
              <div>
                <h4>Email</h4>
                <p>info@shanalcars.com</p>
              </div>
            </div>
            <div class="contact-item">
              <i class="contact-icon">📍</i>
              <div>
                <h4>Location</h4>
                <p>Mauritius Island</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <div class="container">
          <p>&copy; 2024 Shanal Cars. All rights reserved.</p>
        </div>
      </footer>

      <!-- Booking Modal -->
      <div *ngIf="showBookingModal" class="modal-overlay" (click)="closeBookingModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Book {{ selectedService?.name }}</h3>
            <button class="close-btn" (click)="closeBookingModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="submitBooking()" #bookingForm="ngForm">
              <div class="form-group">
                <label for="customerName">Full Name *</label>
                <input 
                  type="text" 
                  id="customerName" 
                  name="customerName" 
                  [(ngModel)]="bookingFormData.customerName" 
                  required 
                  class="form-input"
                  placeholder="Enter your full name"
                >
              </div>
              
              <div class="form-group">
                <label for="customerPhone">Phone Number *</label>
                <input 
                  type="tel" 
                  id="customerPhone" 
                  name="customerPhone" 
                  [(ngModel)]="bookingFormData.customerPhone" 
                  required 
                  class="form-input"
                  placeholder="+230 123 456 789"
                >
              </div>
              
              <div class="form-group">
                <label for="bookingDate">Preferred Date *</label>
                <input 
                  type="date" 
                  id="bookingDate" 
                  name="bookingDate" 
                  [(ngModel)]="bookingFormData.bookingDate" 
                  required 
                  class="form-input"
                  [min]="today"
                >
              </div>
              
              <div class="form-group">
                <label for="notes">Additional Notes</label>
                <textarea 
                  id="notes" 
                  name="notes" 
                  [(ngModel)]="bookingFormData.notes" 
                  class="form-input"
                  rows="3"
                  placeholder="Any special requests or additional information..."
                ></textarea>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn-secondary" (click)="closeBookingModal()">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="!bookingForm.valid || isSubmitting">
                  {{ isSubmitting ? 'Submitting...' : 'Submit Booking' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Success Modal -->
      <div *ngIf="showSuccessModal" class="modal-overlay" (click)="closeSuccessModal()">
        <div class="modal success-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Booking Submitted Successfully!</h3>
            <button class="close-btn" (click)="closeSuccessModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="success-content">
              <i class="success-icon">✅</i>
              <p>Thank you for your booking request! We will contact you shortly to confirm your reservation and provide payment details.</p>
              <button class="btn-primary" (click)="closeSuccessModal()">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  services: Service[] = [];
  selectedService: Service | null = null;
  showBookingModal = false;
  showSuccessModal = false;
  isSubmitting = false;
  today = new Date().toISOString().split('T')[0];

  bookingFormData: BookingFormData = {
    customerName: '',
    customerPhone: '',
    serviceName: '',
    bookingDate: '',
    notes: ''
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
      'car-rental': '🚗',
      'sightseeing-tour': '🏝️',
      'catamaran-trip': '⛵',
      'ile-aux-cerfs': '🏖️',
      'airport-transfer': '✈️'
    };
    return icons[serviceId] || '🎯';
  }

  openBookingModal(service: Service) {
    this.selectedService = service;
    this.bookingFormData = {
      customerName: '',
      customerPhone: '',
      serviceName: service.name,
      bookingDate: '',
      notes: ''
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
    this.router.navigate(['/admin']);
  }

  async submitBooking() {
    if (!this.selectedService) return;

    this.isSubmitting = true;
    try {
      await this.bookingService.createBooking(this.bookingFormData);
      this.closeBookingModal();
      this.showSuccessModal = true;
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('There was an error submitting your booking. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }
}
