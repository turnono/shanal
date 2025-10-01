import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
// Corrected import paths: the component resides in src/app/components/admin-dashboard,
// so services are located two levels up in src/app/services and models in src/app/models.
import { AuthService } from "../../services/auth.service";
import { BookingService } from "../../services/booking.service";
import { Booking, BookingStatus } from "../../models/booking.model";

/**
 * Admin dashboard component for managing bookings. This version has been
 * adjusted for manual payment handling. The "Generate Payment Link"
 * functionality has been removed from the UI, and the associated method
 * has been stubbed out. Admins can mark bookings as confirmed once
 * payment is received offline.
 */
@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <!-- Header -->
      <header class="admin-header">
        <div class="container">
          <div class="header-content">
            <div class="logo">
              <h1>Shanal Cars Admin</h1>
            </div>
            <div class="header-actions">
              <span class="welcome-text"
                >Welcome, {{ currentUser?.email }}</span
              >
              <button class="logout-btn" (click)="logout()">Logout</button>
            </div>
          </div>
        </div>
      </header>

      <!-- Login Form -->
      <div *ngIf="!isAuthenticated" class="login-container">
        <div class="login-form">
          <h2>Admin Login</h2>
          <form (ngSubmit)="login()" #loginForm="ngForm" novalidate>
            <div class="form-group">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                [(ngModel)]="loginData.email"
                required
                class="form-input"
                placeholder="admin@shanalcars.com"
                #email="ngModel"
              />
              <div
                class="error-message"
                *ngIf="email.invalid && (email.dirty || email.touched)"
              >
                <small>Enter a valid email address.</small>
              </div>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                [(ngModel)]="loginData.password"
                required
                class="form-input"
                placeholder="Enter your password"
                minlength="6"
                #password="ngModel"
              />
              <div
                class="error-message"
                *ngIf="password.invalid && (password.dirty || password.touched)"
              >
                <small *ngIf="password.errors?.['required']"
                  >Password is required.</small
                >
                <small *ngIf="password.errors?.['minlength']"
                  >Minimum 6 characters.</small
                >
              </div>
            </div>
            <button
              type="submit"
              class="btn-primary"
              [disabled]="!loginForm.valid || isLoggingIn"
            >
              {{ isLoggingIn ? "Logging in..." : "Login" }}
            </button>
          </form>
          <div *ngIf="loginError" class="error-message">
            {{ loginError }}
          </div>
        </div>
      </div>

      <!-- Dashboard Content -->
      <div *ngIf="isAuthenticated" class="dashboard-content">
        <div class="container">
          <!-- Stats Cards -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">📋</div>
              <div class="stat-content">
                <h3>{{ totalBookings }}</h3>
                <p>Total Bookings</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">⏳</div>
              <div class="stat-content">
                <h3>{{ pendingBookings.length }}</h3>
                <p>Awaiting Follow-up</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">✅</div>
              <div class="stat-content">
                <h3>{{ confirmedBookings.length }}</h3>
                <p>Confirmed</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">❌</div>
              <div class="stat-content">
                <h3>{{ cancelledBookings.length }}</h3>
                <p>Cancelled</p>
              </div>
            </div>
          </div>

          <!-- Filter Tabs -->
          <div class="filter-tabs">
            <button
              *ngFor="let status of statusFilters"
              class="tab-btn"
              [class.active]="selectedStatus === status.value"
              (click)="filterByStatus(status.value)"
            >
              {{ status.label }} ({{
                getBookingsByStatus(status.value).length
              }})
            </button>
          </div>

          <!-- Bookings Table -->
          <div class="bookings-section">
            <h2>Bookings</h2>
            <div class="bookings-table">
              <div class="table-header">
                <div class="col">Customer</div>
                <div class="col">Service</div>
                <div class="col">Date</div>
                <div class="col">Status</div>
                <div class="col">Actions</div>
              </div>
              <div class="table-body">
                <div *ngFor="let booking of filteredBookings" class="table-row">
                  <div class="col">
                    <div class="customer-info">
                      <strong>{{ booking.customerName }}</strong>
                      <span class="email" *ngIf="booking.customerEmail">{{
                        booking.customerEmail
                      }}</span>
                      <span class="phone">{{ booking.customerPhone }}</span>
                    </div>
                  </div>
                  <div class="col">
                    <span class="service-name">{{ booking.serviceName }}</span>
                  </div>
                  <div class="col">
                    <span class="booking-date">{{
                      formatDate(booking.bookingDate)
                    }}</span>
                  </div>
                  <div class="col">
                    <span
                      class="status-badge"
                      [ngClass]="'status-' + booking.status"
                    >
                      {{ getStatusLabel(booking.status) }}
                    </span>
                  </div>
                  <div class="col">
                    <div class="action-buttons">
                      <!-- The Generate Payment Link button is disabled for manual payments -->
                      <button
                        class="btn-small btn-secondary"
                        (click)="callCustomer(booking.customerPhone)"
                      >
                        Call Customer
                      </button>
                      <button
                        class="btn-small btn-secondary"
                        (click)="messageCustomer(booking)"
                      >
                        WhatsApp
                      </button>
                      <button
                        *ngIf="booking.status === 'pending'"
                        class="btn-small btn-success"
                        (click)="markAsConfirmed(booking)"
                      >
                        Mark as Confirmed
                      </button>
                      <button
                        *ngIf="booking.status === 'pending'"
                        class="btn-small btn-warning"
                        (click)="markAsCancelled(booking)"
                      >
                        Mark as Cancelled
                      </button>
                      <button
                        class="btn-small btn-info"
                        (click)="viewBookingDetails(booking)"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Booking Details Modal -->
      <div
        *ngIf="showDetailsModal"
        class="modal-overlay"
        (click)="closeDetailsModal()"
      >
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Booking Details</h3>
            <button class="close-btn" (click)="closeDetailsModal()">
              &times;
            </button>
          </div>
          <div class="modal-body" *ngIf="selectedBooking">
            <div class="details-grid">
              <div class="detail-item">
                <label>Customer Name:</label>
                <span>{{ selectedBooking.customerName }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedBooking.customerEmail">
                <label>Email:</label>
                <span>{{ selectedBooking.customerEmail }}</span>
              </div>
              <div class="detail-item">
                <label>Phone:</label>
                <span>{{ selectedBooking.customerPhone }}</span>
              </div>
              <div class="detail-item">
                <label>Service:</label>
                <span>{{ selectedBooking.serviceName }}</span>
              </div>
              <div class="detail-item">
                <label>Booking Date:</label>
                <span>{{ formatDate(selectedBooking.bookingDate) }}</span>
              </div>
              <div class="detail-item">
                <label>Status:</label>
                <span
                  class="status-badge"
                  [ngClass]="'status-' + selectedBooking.status"
                >
                  {{ getStatusLabel(selectedBooking.status) }}
                </span>
              </div>
              <div class="detail-item" *ngIf="selectedBooking.notes">
                <label>Notes:</label>
                <span>{{ selectedBooking.notes }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedBooking.ownerNotifiedAt">
                <label>Owner Notified:</label>
                <span>{{ formatDate(selectedBooking.ownerNotifiedAt) }}</span>
              </div>
              <div
                class="detail-item"
                *ngIf="selectedBooking.customerNotifiedAt"
              >
                <label>Customer Notified:</label>
                <span>{{
                  formatDate(selectedBooking.customerNotifiedAt)
                }}</span>
              </div>
              <div class="detail-item" *ngIf="selectedBooking.paidAt">
                <label>Paid At:</label>
                <span>{{ formatDate(selectedBooking.paidAt) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ["./admin-dashboard.component.scss"],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  currentUser: any = null;
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  selectedStatus: string = "all";
  showDetailsModal = false;
  selectedBooking: Booking | null = null;
  isLoggingIn = false;
  loginError = "";

  loginData = {
    email: "",
    password: "",
  };

  statusFilters = [
    { value: "all", label: "All" },
    { value: "pending", label: "Awaiting Follow-up" },
    { value: "confirmed", label: "Confirmed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private bookingService: BookingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.subscriptions.push(
      this.authService.isAuthenticated().subscribe((isAuth) => {
        this.isAuthenticated = isAuth;
        if (isAuth) {
          this.loadBookings();
        }
      })
    );

    this.subscriptions.push(
      this.authService.getCurrentUser().subscribe((user) => {
        this.currentUser = user;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  async login() {
    this.isLoggingIn = true;
    this.loginError = "";

    try {
      await this.authService.signIn(
        this.loginData.email,
        this.loginData.password
      );
    } catch (error: any) {
      this.loginError =
        error.message || "Login failed. Please check your credentials.";
    } finally {
      this.isLoggingIn = false;
    }
  }

  async logout() {
    try {
      await this.authService.signOut();
      this.router.navigate(["/"]);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  loadBookings() {
    this.subscriptions.push(
      this.bookingService.getBookings().subscribe((bookings) => {
        this.bookings = bookings;
        this.filterBookings();
      })
    );
  }

  filterByStatus(status: string) {
    this.selectedStatus = status;
    this.filterBookings();
  }

  filterBookings() {
    if (this.selectedStatus === "all") {
      this.filteredBookings = this.bookings;
    } else {
      this.filteredBookings = this.bookings.filter(
        (booking) => booking.status === this.selectedStatus
      );
    }
  }

  getBookingsByStatus(status: string): Booking[] {
    if (status === "all") return this.bookings;
    return this.bookings.filter((booking) => booking.status === status);
  }

  get totalBookings(): number {
    return this.bookings.length;
  }

  get pendingBookings(): Booking[] {
    return this.bookings.filter((booking) => booking.status === "pending");
  }

  get confirmedBookings(): Booking[] {
    return this.bookings.filter((booking) => booking.status === "confirmed");
  }

  get cancelledBookings(): Booking[] {
    return this.bookings.filter((booking) => booking.status === "cancelled");
  }

  getStatusLabel(status: BookingStatus): string {
    const labels: { [key in BookingStatus]: string } = {
      pending: "Awaiting Follow-up",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async markAsConfirmed(booking: Booking) {
    if (!booking.id) return;

    try {
      await this.bookingService.updateBookingStatus(booking.id, "confirmed");
    } catch (error) {
      console.error("Error updating booking status:", error);
      alert("Error updating booking status. Please try again.");
    }
  }

  async markAsCancelled(booking: Booking) {
    if (!booking.id) return;

    try {
      await this.bookingService.updateBookingStatus(booking.id, "cancelled");
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert("Error cancelling booking. Please try again.");
    }
  }

  callCustomer(phone: string) {
    if (!phone) {
      return;
    }
    const sanitized = phone.replace(/\s+/g, "");
    window.open(`tel:${sanitized}`, "_self");
  }

  messageCustomer(booking: Booking) {
    if (!booking.customerPhone) {
      return;
    }
    const digits = booking.customerPhone.replace(/[^0-9+]/g, "");
    const phoneNumber = digits.startsWith("+") ? digits.substring(1) : digits;
    const message = encodeURIComponent(
      `Hello ${booking.customerName}, this is Shanal Cars regarding your ${
        booking.serviceName
      } booking on ${this.formatDate(
        booking.bookingDate
      )}. We will coordinate payment with you.`
    );
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
  }

  viewBookingDetails(booking: Booking) {
    this.selectedBooking = booking;
    this.showDetailsModal = true;
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedBooking = null;
  }
}
