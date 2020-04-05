import { Injectable } from '@angular/core';
import { Logger } from '@core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { Observable, of, from } from 'rxjs';
import { take, map, mergeMap, catchError } from 'rxjs/operators';
import { User } from 'firebase/app';

export interface UserSettings {
  can_read: boolean;
  can_write: boolean;
}

export interface Credentials {
  // Customize received credentials here
  username: string;
  user: User;
  settings: UserSettings | null;
}

const log = new Logger('CredentialsService');

/**
 * Provides storage for authentication credentials.
 * The Credentials interface should be replaced with proper implementation.
 */
@Injectable({
  providedIn: 'root',
})
export class CredentialsService {
  private _credentials: Credentials | null = null;

  constructor(private firebaseAuth: AngularFireAuth, private firestore: AngularFirestore) {
    this.credentials.subscribe((creds) => {
      this._credentials = creds;
    });
  }

  isAuthenticated(): Observable<boolean> {
    return this.credentials.pipe(
      map((creds) => {
        return !!creds;
      })
    );
  }

  isReadAllowed(): Observable<boolean> {
    return this.credentials.pipe(
      map((creds) => {
        return !!creds && !!creds.settings && creds.settings.can_read;
      })
    );
  }

  isWriteAllowed(): Observable<boolean> {
    return this.credentials.pipe(
      map((creds) => {
        return !!creds && !!creds.settings && creds.settings.can_write;
      })
    );
  }
  /**
   * Gets the user credentials.
   * @return The user credentials or null if the user is not authenticated.
   */
  get credentials(): Observable<Credentials | null> {
    log.debug('Checking credentials...');
    return this.firebaseAuth.user
      .pipe(take(1))
      .pipe(
        catchError((err) => {
          log.debug('Error looking up user credentials: ' + err);
          return of(null);
        })
      )
      .pipe(
        mergeMap((u) => {
          if (!u) {
            return of(null);
          }
          log.debug('Got user ' + JSON.stringify(u));
          return this.firestore
            .doc<UserSettings>('user_permissions/' + u.uid)
            .valueChanges()
            .pipe(take(1))
            .pipe(
              catchError((err) => {
                log.debug('Error looking up user permissions: ' + err);
                return of(null);
              })
            )
            .pipe(
              map((s) => {
                log.debug('Got user settings ' + JSON.stringify(s));
                return {
                  username: u.displayName,
                  user: u,
                  settings: !!s ? s : null,
                };
              })
            );

          // TODO add bypass for emergency mode!
        })
      );
  }

  get cachedCredentials(): Credentials | null {
    return this._credentials;
  }
}
