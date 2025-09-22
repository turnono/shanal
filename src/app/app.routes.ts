import { Routes } from "@angular/router";
import { HomeComponent } from "./components/home/home.component";
import { AdminDashboardComponent } from "./components/admin-dashboard/admin-dashboard.component";
import { AuthGuard } from "./guards/auth.guard";

export const routes: Routes = [
  { path: "", component: HomeComponent },
  {
    path: "admin",
    component: AdminDashboardComponent,
    canActivate: [AuthGuard],
  },
  { path: "**", redirectTo: "" },
];
