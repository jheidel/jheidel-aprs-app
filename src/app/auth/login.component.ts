import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { finalize, map } from 'rxjs/operators';

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
  no_permissions = false;
  username: string;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private authenticationService: AuthenticationService,
    private credentialsService: CredentialsService
  ) {
    this.createForm();

    this.credentialsService.credentials.subscribe((creds) => {
      if (!creds) {
        this.no_permissions = false;
        this.username = '[not signed in]';
        return;
      }
      this.no_permissions = !creds.settings || !creds.settings.can_read;
      this.username = creds.username;
      if (!this.no_permissions) {
        log.info('Already good to go, have permissions, redirecting.');
        this.redirect();
      }
    });
  }

  ngOnInit() {}

  ngOnDestroy() {}

  redirect() {
    this.router.navigate([this.route.snapshot.queryParams.redirect || '/'], { replaceUrl: true });
  }

  login() {
    this.isLoading = true;
    const login$ = this.authenticationService.login(this.loginForm.value);
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
          this.redirect();
        },
        (error) => {
          log.debug(`Login error: ${error}`);
          this.error = error;
        }
      );
  }

  private createForm() {
    this.loginForm = this.formBuilder.group({});
  }
}
