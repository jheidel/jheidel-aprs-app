import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { Logger } from '@core';
import { CredentialsService } from './credentials.service';

const log = new Logger('AuthenticationGuard');

@Injectable({
  providedIn: 'root',
})
export class AuthenticationGuard implements CanActivate {
  constructor(private router: Router, private credentialsService: CredentialsService) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return this.credentialsService
      .isReadAllowed()
      .toPromise()
      .then((allowed) => {
        if (allowed) {
          return true;
        }
        log.debug('Not authenticated or read access denied, redirecting and adding redirect url...');
        this.router.navigate(['/login'], { queryParams: { redirect: state.url }, replaceUrl: true });
        return false;
      });
  }
}
