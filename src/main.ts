import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { provideRouter } from "@angular/router";
import { provideFirebaseApp, initializeApp } from "@angular/fire/app";
import {
  provideFirestore,
  getFirestore,
  connectFirestoreEmulator,
} from "@angular/fire/firestore";
import { provideAuth, getAuth, connectAuthEmulator } from "@angular/fire/auth";
import {
  provideFunctions,
  getFunctions,
  connectFunctionsEmulator,
} from "@angular/fire/functions";
import {
  provideAppCheck,
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "@angular/fire/app-check";
import { routes } from "./app/app.routes";
import { environment } from "./environments/environment";
import {
  provideAppCheck,
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "@angular/fire/app-check";

const providers = [
  provideRouter(routes),
  provideFirebaseApp(() => initializeApp(environment.firebase)),
  provideFirestore(() => {
    const firestore = getFirestore();
    if (environment.useEmulators && !environment.production) {
      connectFirestoreEmulator(
        firestore,
        environment.emulatorConfig.firestore.host,
        environment.emulatorConfig.firestore.port
      );
    }
    return firestore;
  }),
  provideAuth(() => {
    const auth = getAuth();
    if (environment.useEmulators && !environment.production) {
      connectAuthEmulator(
        auth,
        `http://${environment.emulatorConfig.auth.host}:${environment.emulatorConfig.auth.port}`
      );
    }
    return auth;
  }),
  provideFunctions(() => {
    const functions = getFunctions();
    if (environment.useEmulators && !environment.production) {
      connectFunctionsEmulator(
        functions,
        environment.emulatorConfig.functions.host,
        environment.emulatorConfig.functions.port
      );
    }
    return functions;
  }),
];

const recaptchaKey = environment.recaptchaSiteKey?.trim();
if (recaptchaKey) {
  providers.push(
    provideAppCheck(() =>
      initializeAppCheck(undefined, {
        provider: new ReCaptchaV3Provider(recaptchaKey),
        isTokenAutoRefreshEnabled: true,
      })
    )
  );
}

bootstrapApplication(AppComponent, {
  providers,
}).catch((err) => console.error(err));
