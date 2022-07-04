import { NgModule } from '@angular/core';
import { WeatherInfoPage } from './weather-info';
import {AngularWeatherWidgetModule, WeatherApiName} from 'angular-weather-widget';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {RouterModule} from '@angular/router';

@NgModule({
  declarations: [
    WeatherInfoPage,
  ],
  imports: [
    AngularWeatherWidgetModule.forRoot({
      key: 'd96fec20a55de10e935fbe8dc055bb89',
      name: WeatherApiName.OPEN_WEATHER_MAP,
      baseUrl: 'https://api.openweathermap.org/data/2.5'
    }),
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: WeatherInfoPage
      }
    ])
  ],
})
export class WeatherInfoPageModule {}
