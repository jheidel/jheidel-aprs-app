import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { environment } from '@env/environment';
import { Logger, untilDestroyed } from '@core';
import { AuthenticationService } from './authentication.service';
import { CredentialsService, Credentials } from './credentials.service';

const log = new Logger('Login');

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  version: string | null = environment.version;
  error: string | undefined;
  loginForm!: FormGroup;
  isLoading = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private authenticationService: AuthenticationService,
    private credentialsService: CredentialsService
  ) {
    this.createForm();
  }

  ngOnInit() {}

  ngOnDestroy() {}

  login() {
    this.isLoading = true;
    const login$ = this.authenticationService.login(this.loginForm.value);
    log.debug('LOGIN');
    login$
      .pipe(
        finalize(() => {
          this.loginForm.markAsPristine();
          this.isLoading = false;
        }),
        untilDestroyed(this)
      )
      .subscribe(
        (username) => {
          log.debug(`${username} successfully logged in`);
          this.router.navigate([this.route.snapshot.queryParams.redirect || '/'], { replaceUrl: true });
        },
        (error) => {
          log.debug(`Login error: ${error}`);
          this.error = error;
        }
      );
  }

  public get no_permissions(): boolean {
    const creds = this.credentialsService.cachedCredentials;
    if (!creds) {
      return false; // Unknown, have to let them log in first.
    }
    return !creds.settings || !creds.settings.can_read;
  }
  public get username(): string {
    const creds = this.credentialsService.cachedCredentials;
    return !!creds ? creds.username : '[not signed in]';
  }

  private createForm() {
    this.loginForm = this.formBuilder.group({});
  }
}