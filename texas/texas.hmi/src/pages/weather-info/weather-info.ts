import { Component } from '@angular/core';
// import {ForecastMode, TemperatureScale, WeatherLayout, WeatherSettings} from 'angular-weather-widget';
import {OwnTrackService} from '../../services/own-track';
import {ModalController, NavParams} from '@ionic/angular';
import {TemperatureScale, WeatherSettings, ForecastMode, WeatherLayout} from 'angular-weather-widget';

@Component({
  selector: 'page-weather-info',
  templateUrl: 'weather-info.html',
})
export class WeatherInfoPage {

  settings: WeatherSettings = {
    location: {
      latLng:  {
        lat: this.owntrack.position.lat,
        lng: this.owntrack.position.lon
      }
    },
    backgroundColor: '#ffffff',
    color: '#222222',
    width: 'auto',
    height: 'auto',
    showWind: true,
    scale: TemperatureScale.CELCIUS,
    forecastMode: ForecastMode.DETAILED,
    showDetails: true,
    showForecast: false,
    layout: WeatherLayout.NARROW,
    language: 'en'
  };

  constructor(public navParams: NavParams, private owntrack: OwnTrackService, private modalCtrl: ModalController) {
  }

  ionViewDidLoad() {

  }

  dismiss() {
     this.modalCtrl.dismiss();
  }
}
