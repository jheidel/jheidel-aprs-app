import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Observable, of, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { auth } from 'firebase/app';

import { Credentials } from './credentials.service';

export interface LoginContext {
  username: string;
  password: string;
  remember?: boolean;
}

/**
 * Provides a base for authentication workflow.
 * The login/logout methods should be replaced with proper implementation.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  constructor(private firebaseAuth: AngularFireAuth) {}

  /**
   * Authenticates the user.
   * @param context The login parameters.
   * @return The user credentials.
   */
  login(context: LoginContext): Observable<string> {
    return from(
      this.firebaseAuth.signInWithPopup(new auth.GoogleAuthProvider()).then((result) => {
        return result.user.displayName;
      })
    );
  }

  /**
   * Logs out the user and clear credentials.
   * @return True if the user was logged out successfully.
   */
  logout(): Observable<boolean> {
    return from(this.firebaseAuth.signOut()).pipe(
      map((result) => {
        return true;
      })
    );
  }
}
