import {Component, OnDestroy, OnInit} from '@angular/core';
import { Subscription } from 'rxjs';
import {WeatherProvider} from '../../services/weather';
import {AlertController, ModalController} from '@ionic/angular';
import {WeatherInfoPage} from '../../pages/weather-info/weather-info';

@Component({
  selector: 'weather',
  templateUrl: 'weather.html'
})
export class WeatherComponent implements OnInit, OnDestroy {

  public weather = null;
  public icon = 'md-sunny';

  sub: Subscription;

  constructor(private weatherProvider: WeatherProvider,
              private alertCtrl: AlertController,
              public modalCtrl: ModalController) { }

  ngOnInit() {
    this.sub = this.weatherProvider.weatherChanged$.subscribe(((weather: any) => {
      this.weather = weather;

      if (this.weather && this.weather.weather.length > 0) {
        if (this.weather.weather[0].description.toLowerCase().includes('cloud')) {
          this.icon = 'md-cloud';
        } else if (this.weather.weather[0].description.toLowerCase().includes('few clouds')) {
          this.icon = 'md-partly-sunny';
        } else if (this.weather.weather[0].description.toLowerCase().includes('snow')) {
          this.icon = 'md-snow';
        } else if (this.weather.weather[0].description.toLowerCase().includes('rain')) {
          this.icon = 'md-rainy';
        } else if (this.weather.weather[0].description.toLowerCase().includes('thunderstorm')) {
          this.icon = 'md-thunderstorm';
        } else if (this.weather.weather[0].description.toLowerCase().includes('clear')) {
          this.icon = 'md-sunny';
        }
      }
    }));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  async showWeather() {
    if (this.weather) {
      const profileModal = await this.modalCtrl.create(
          { component: WeatherInfoPage,
           componentProps: {}});
      profileModal.present();
    }
  }
}

