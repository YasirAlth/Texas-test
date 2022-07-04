/**
 * Created by mathe on 13/07/2017.
 */
import { Injectable } from '@angular/core';
import {Coordinates, Geolocation, Geoposition} from '@ionic-native/geolocation/ngx';
import {fromEvent, Observable, Subscription} from 'rxjs';
import { ConfigService } from './config';
import { Settings } from '../interfaces';
import { Subject } from 'rxjs';
import { ErrorService } from './error';
import {LatLonSpherical} from 'geodesy';
import { isNullOrUndefined } from '../functions/Utils';
import {BatteryStatus} from '@ionic-native/battery-status/ngx';
import {DeviceOrientation, DeviceOrientationCompassHeading} from '@ionic-native/device-orientation/ngx';
import {filter} from 'rxjs/operators';

@Injectable()
export class LocationService {

  public locationChange$: Observable<Coordinates>;
  public headingChange$: Observable<number>;
  public powerModeChange$: Observable<string>;

  private locationChangeSource: Subject<Coordinates>;
  private locationServiceSub: Subscription;
  private locationTimer = -1;
  private headingChangeSource: Subject<number>;
  private powerModeChangeSource: Subject<string>;
  private orientationServiceSub: any;
  private selfBattery = 100;

  constructor(
    private config: ConfigService,
    private geolocation: Geolocation,
    private deviceOrientation: DeviceOrientation,
    private batteryStatus: BatteryStatus,
    private errorService: ErrorService
  ) {
    this.locationChangeSource = new Subject<Coordinates>();
    this.locationChange$ = this.locationChangeSource.asObservable();
    this.headingChangeSource = new Subject<number>();
    this.headingChange$ = this.headingChangeSource.asObservable();
    this.powerModeChangeSource = new Subject<string>();
    this.powerModeChange$ = this.powerModeChangeSource.asObservable();

    // See here: https://github.com/ionic-team/ionic-native/issues/2972
    fromEvent(window, 'batterystatus').subscribe((status: any ) => {
      this.selfBattery = status.level;
    });
    setTimeout(() => {
      this.handleNewSettings(this.config.settings);
      this.config.settingsChanged$.subscribe(settings => this.handleNewSettings(settings));
    }, 1000) as any;
  }

  private handleNewSettings(settings: Settings): void {
    if (isNullOrUndefined(settings)) { return; }
    this.clearTimer();
    this.clearSubscription();

    if (settings.gpsEnabled) {
      if (settings.selfTrackUpdateRate <= 0) {
        // Auto update rate

        let prevLocation: LatLonSpherical;
        const calculateDistance = (geopos: Geoposition) => {
          const newPos = new LatLonSpherical(geopos.coords.latitude, geopos.coords.longitude);
          const distance = prevLocation ? prevLocation.distanceTo(newPos) : this.config.settings.movementThreshold;
          prevLocation = newPos;
          return distance;
        };

        const isBatteryLow = () => this.selfBattery <= settings.powerSaveBatteryThreshold;

        let prevTime: number;
        const distanceWaitTime = this.config.settings.maximumTrackUpdateRate - 500; // add a bit of leniency (500ms)
        const isMovementLow = (geopos: Geoposition) => {
          // Movement is checked if in the last 10s (max update) the device has travelled the threshold
          const currentTime = Date.now();
          if (prevTime && currentTime - prevTime < distanceWaitTime) {
            // Not long enough to check yet
            // Return should bias high movement (only want to switch to low after long checks)
            return false;
          }

          const distance = calculateDistance(geopos);
          prevTime = currentTime;

          return distance < this.config.settings.movementThreshold;
        };

        const highPower = () => {
          this.powerModeChangeSource.next('high');
          this.locationServiceSub = this.geolocation.watchPosition({enableHighAccuracy: true}).pipe(
            filter(geopos => geopos.coords !== undefined))
            .subscribe(geopos => {
              this.handleNewLocation(geopos);
              if (isBatteryLow() || isMovementLow(geopos)) {
                // enter low speed
                this.clearSubscription();
                lowPower();
              }
            });
        };

        const lowPower = () => {
          this.powerModeChangeSource.next('low');
          this.locationTimer = window.setInterval(() => {
            this.geolocation.getCurrentPosition().then((geopos) => {
              this.handleNewLocation(geopos);
              if (!isBatteryLow() && !isMovementLow(geopos)) {
                // enter high speed
                this.clearTimer();
                highPower();
              }
            }).catch(error => this.errorService.log('GPS read failed for low power mode (auto mode set)', true));
          }, settings.maximumTrackUpdateRate);
        };

        // start off by only checking by battery
        isBatteryLow() ? lowPower() : highPower();

      } else if (settings.selfTrackUpdateRate < 5000) {
        // Manual high power for GPS
        this.powerModeChangeSource.next('high');
        this.locationServiceSub = this.geolocation.watchPosition({enableHighAccuracy: true}).pipe(
          filter(geopos => geopos.coords !== undefined))
          .subscribe(geopos => this.handleNewLocation(geopos));
      } else {
        // Manual low power for GPS
        this.powerModeChangeSource.next('low');
        this.locationTimer = window.setInterval(() => {
          this.geolocation.getCurrentPosition().then(geopos => {
            this.handleNewLocation(geopos);
          }).catch(error => this.errorService.log('GPS read failed for low power mode', true));
        }, settings.selfTrackUpdateRate);
      }
    } else {
      this.powerModeChangeSource.next('off');
    }

    if (settings.compassEnabled) {
      this.deviceOrientation.getCurrentHeading()
        .then(head => this.handleNewOrientation(head))
        .catch(error => this.errorService.log(`Compass read failed (${error})`, true));
      this.orientationServiceSub = this.deviceOrientation.watchHeading()
        // .filter(o => o.trueHeading >= 0)
        .subscribe(orientation => this.handleNewOrientation(orientation),
          error => this.errorService.log(`Compass read failed (${error})`, true));
    } else if (this.orientationServiceSub) {
      this.orientationServiceSub.unsubscribe();
    }
  }

  private handleNewOrientation(orientation: DeviceOrientationCompassHeading): void {
    const heading: number = orientation.trueHeading;
    this.headingChangeSource.next(heading);
  }
  private handleNewLocation(geopos: Geoposition): void {
    this.locationChangeSource.next(geopos.coords);
  }

  private clearTimer(): void {
    if (this.locationTimer) {
      clearInterval(this.locationTimer);
      this.locationTimer = undefined;
    }
  }
  private clearSubscription(): void {
    if (this.locationServiceSub) {
      this.locationServiceSub.unsubscribe();
      this.locationServiceSub = undefined;
    }
  }
}
