import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Subject, BehaviorSubject, Observable} from 'rxjs';
import {Coordinates} from '@ionic-native/geolocation';
import {ErrorService} from './error';
import {LatLon} from '../interfaces';
import {LocationService} from './location';

@Injectable()
export class WeatherProvider {

  private static readonly WEATHER_INTERVAL = 1000 * 60 * 2; // 2 minutes
  private static readonly OPEN_WEATHER_ID = 'd96fec20a55de10e935fbe8dc055bb89';

  private location: LatLon = null;

  private readonly weatherSource: Subject<any> = new BehaviorSubject<any>(null);
  public readonly weatherChanged$: Observable<boolean> = this.weatherSource.asObservable();


  constructor(public http: HttpClient, private locationService: LocationService, private errorService: ErrorService) {

    this.locationService.locationChange$.subscribe((coords: Coordinates) => {
      const location: LatLon = { lat: coords.latitude, lon: coords.longitude } as LatLon;
      const initial = this.location === null;

      this.location = location || this.location;

      if (initial) {
        // Get initial weather.
        this.getWeather();

        // And schedule
        window.setInterval(async () => {
          await this.getWeather();
        }, WeatherProvider.WEATHER_INTERVAL);
      }

    });
  }

  private async getWeather(): Promise<any> {
    const params = '?APPID=' + WeatherProvider.OPEN_WEATHER_ID
      + '&lat=' + this.location.lat
      + '&lon=' + this.location.lon
      + '&units=metric';

    return await this.http.get('https://api.openweathermap.org/data/2.5/weather' + params).toPromise().then(data => {
      this.weatherSource.next(data);
      return data;
    }).catch(error => this.errorService.log('GET weather failed', true));
  }
}

