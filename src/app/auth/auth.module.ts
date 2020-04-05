import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';

import { SharedModule } from '@shared';
import { MaterialModule } from '@app/material.module';
import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './login.component';

@NgModule({
  imports: [CommonModule, ReactiveFormsModule, SharedModule, FlexLayoutModule, MaterialModule, AuthRoutingModule],
  declarations: [LoginComponent],
})
export class AuthModule {}
