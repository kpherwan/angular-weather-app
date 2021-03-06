import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SearchCardComponent } from './search-card/search-card.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HighchartsChartModule } from 'highcharts-angular';
import { SlideComponent } from './search-card/slide/slide.component';

@NgModule({
  declarations: [
    AppComponent,
    SearchCardComponent,
    SlideComponent
  ],
  imports: [
    BrowserModule,
    NgbModule,
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatAutocompleteModule,
    FontAwesomeModule,
    HighchartsChartModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
