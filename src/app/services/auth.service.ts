import { Injectable } from "@angular/core";
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "@angular/fire/auth";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class AuthService {
  constructor(private auth: Auth) {}

  signIn(email: string, password: string): Promise<any> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }

  getCurrentUser(): Observable<User | null> {
    return new Observable((observer) => {
      this.auth.onAuthStateChanged(observer);
    });
  }

  isAuthenticated(): Observable<boolean> {
    return this.getCurrentUser().pipe(map((user) => !!user));
  }
}
