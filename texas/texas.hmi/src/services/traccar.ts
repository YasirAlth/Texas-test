import {HttpClient, HttpHeaders} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { isNullOrUndefined } from '../functions/Utils';
import {Subject} from 'rxjs';
import {Settings, Track} from '../interfaces';
import {ErrorService} from './error';
import {ConfigService} from './config';
import {Source} from '../enums/source';

@Injectable()
export class TraccarProvider {

  private owntrackSubject = new Subject<Track>();
  public owntrackUpdate = this.owntrackSubject.asObservable();

  private tracksSubject = new Subject<Track>();
  public tracksUpdate = this.tracksSubject.asObservable();

  private timerId = -1;

  private positions;
  private devices;

  private _timeout = 10000;

  private traccarCredentials = 'texas:texas';

  /**
   * Constructor.
   * @param {HttpClient} http - http service.
   * @param {ErrorService} errorService - error service.
   * @param {ConfigService} config - config service.
   */
  constructor(public http: HttpClient, public errorService: ErrorService, private config: ConfigService) {

    // Subscribe to config changes.
    this.config.settingsChanged$.subscribe((settings: Settings) => {
      if (isNullOrUndefined(settings)) { return; }
      if (settings.traccarEnabled) {
        if (this.timerId == -1 ) {
          // Enable timer if the traccar setting is enabled.
          this.timerId = this.startTimer() as any;
          console.log('Traccar Provider Timer Started');
        }
      } else if (this.timerId !== -1) {
        // Clear the timeer if the traccar setting is disabled.
        console.log('Traccar Provider Timer Disabled');
        clearInterval(this.timerId);
        this.timerId = -1;
      }
    });
  }

  /**
   * Starts a timer to poll the Traccar service.
   * @returns {number} the Id of the timer.
   */
  private startTimer() {
    return window.setInterval(async () => {
      console.log('Traccar Provider Running...');
      // Wait for the devices and the positions to return.
      this.positions = undefined;
      this.devices = undefined;
      await Promise.all([this.getDevices(),  this.getPositions()]);

      if (this.positions && this.devices) {

        // Iterate each device.
        this.devices.forEach(device => {

          // Does this device have a position?
          const position = this.positions.filter(position => position.deviceId === device.id && device.status === 'online');

          if (position.length > 0) {

            // Create a track from the position.
            const track: Track = {
              deviceId: device.uniqueId,
              deviceName: device.name,
              timestamp: new Date(),
              active: true,
              position: {lat: position[0].latitude, lon: position[0].longitude},
              heading: 0,
              battery: 100,
              course: isNullOrUndefined(position[0].course) ? 0 : position[0].course,
              updateRate: this._timeout,
              whiteList: '',
              source: [Source.Traccar],
              primarySource: Source.Traccar,
              type: 'ASSET',
              categoryId: 0,
              agencyId: 0
            };

            // Treat Owntrack differently.
            if (device.uniqueId === this.config.settings.traccarTrackerId) {
              this.owntrackSubject.next(track);
            } else {
              this.tracksSubject.next(track);
            }
          }
        });
      }
    }, this._timeout);
  }

  /**
   * Gets the positions from Traccar
   * @returns {Promise<void>}
   */
  private async getPositions() {
    const headers = this.createHeader();

    await this.http.get(this.config.settings.traccarApiBase + 'positions', {headers}).toPromise().then((positions: any) => {
      this.positions = positions;
    }).catch(error => this.errorService.log('Get positions failed', true));
  }

  /**
   * Gets the devices from Traccar.
   * @returns {Promise<void>}
   */
  private async getDevices() {
    const headers = this.createHeader();

    await this.http.get(this.config.settings.traccarApiBase + 'devices?all=true', {headers}).toPromise().then((devices: any) => {
      this.devices = devices;
    }).catch(error => this.errorService.log('Get devices failed', true));
  }

  /**
   * Creates a header for the http request.
   * @returns {HttpHeaders}
   */
  private createHeader() {
    let headers = new HttpHeaders();

    headers = headers.append('Authorization', 'Basic ' + btoa(this.traccarCredentials));
    headers = headers.append('Content-Type', 'application/json');
    return headers;
  }
}
