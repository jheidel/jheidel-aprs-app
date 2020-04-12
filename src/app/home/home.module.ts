import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';

import { CoreModule } from '@core';
import { SharedModule } from '@shared';
import { MaterialModule } from '@app/material.module';
import { MatButtonModule } from '@angular/material/button';
import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';

import { MarkdownModule } from 'ngx-markdown';

@NgModule({
  imports: [
    CommonModule,
    CoreModule,
    SharedModule,
    FlexLayoutModule,
    MaterialModule,
    MatButtonModule,
    HomeRoutingModule,
    MarkdownModule.forChild(),
  ],
  declarations: [HomeComponent],
})
export class HomeModule {}
