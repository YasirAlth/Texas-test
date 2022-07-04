import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { Storage } from '@ionic/storage';
import {ConfigService} from './config';

export interface DisplaySettings {
  trackHistory: boolean;
  markerId: boolean;
  markerBattery: boolean;
  markerUpdateRate: boolean;
  markerCategory: boolean;
  markerLastUpdate: boolean;
  source: boolean;
  alertDevice: boolean;
  alertEta: boolean;
  manualId: boolean;
  manualDevice: boolean;
  manualEta: boolean;
  minimumEta: boolean;
  positionUncertainty: boolean;
}

@Injectable()
export class DisplayConfigService {

  public get settings(): DisplaySettings {
    return this._settings;
  }

  public set settings(value: DisplaySettings) {
    this._settings = value;
    this.storage.set('display', this._settings);
    this.settingsChangedSource.next(this._settings);
  }

  constructor(private storage: Storage,
              private config: ConfigService) {

    this.storage.get('display')
      .then((data: any) => {
        // handle the case where no settings are stored
        if (data !== null) {
          this._settings = data;
          this.settingsChangedSource.next(this._settings);
        } else {
          // Override other initial setting profiles 5 seconds to give time for the config service
          window.setTimeout(() => {
            if (this.config.settings.categoryId === 6) {
              console.log('Command & Control marker configuration profile loaded.');
              this.settings = DisplayConfigService.COMMANDCONTROL_SETTINGS;
            } else if (!this.config.isOnDevice() || this.config.settings.categoryId === 7) {
              console.log('Monitoring marker configuration profile loaded.');
              this.settings = DisplayConfigService.MONITORING_SETTINGS;
            }
          }, 5000);
        }
      }).catch(error => console.error('Error loading display settings: ' + (error.message || error)));

  }

  public static readonly SETTING_LABELS: { [key: string]: string} = {
    trackHistory: 'Track History',
    markerId: 'Device ID',
    markerBattery: 'Battery',
    markerUpdateRate: 'Update Rate',
    markerCategory: 'Category',
    markerLastUpdate: 'Last Update',
    source: 'Source',
    alertDevice: 'Alert Device',
    alertEta: 'Alert ETA',
    manualId: 'Manual Track ID',
    manualDevice: 'Manual Track Device',
    manualEta: 'Manual Track ETA',
    minimumEta: 'Minimum Track ETA',
    positionUncertainty: 'Position Uncertainty'
  };

  // Settings for specific groups:

  // For most devices:
  // - Requires ETA for own device.
  private static readonly DEVICE_SETTINGS: DisplaySettings = {
    trackHistory: false,
    markerId: false,
    markerBattery: false,
    markerUpdateRate: false,
    markerCategory: false,
    markerLastUpdate: false,
    source: false,
    alertDevice: false,
    alertEta: true,
    manualId: false,
    manualDevice: false,
    manualEta: true,
    minimumEta: false,
    positionUncertainty: false
  };

  // For a Command & Control device:
  // - Requires calculated minimum ETA,
  // - who has placed markers/alerts,
  // - track history.
  private static readonly COMMANDCONTROL_SETTINGS: DisplaySettings = {
    trackHistory: true,
    markerId: false,
    markerBattery: false,
    markerUpdateRate: false,
    markerCategory: false,
    markerLastUpdate: false,
    source: false,
    alertDevice: true,
    alertEta: false,
    manualId: false,
    manualDevice: true,
    manualEta: false,
    minimumEta: true,
    positionUncertainty: true
  };

  // For a Monitoring device (e.g. Exp):
  // - Requires battery level and update rate,
  // - who has placed markers/alerts.
  private static readonly MONITORING_SETTINGS: DisplaySettings = {
    trackHistory: false,
    markerId: false,
    markerBattery: true,
    markerUpdateRate: true,
    markerCategory: false,
    markerLastUpdate: false,
    source: false,
    alertDevice: true,
    alertEta: false,
    manualId: false,
    manualDevice: true,
    manualEta: false,
    minimumEta: false,
    positionUncertainty: false
  };

  private _settings = DisplayConfigService.DEVICE_SETTINGS;

  private readonly settingsChangedSource: Subject<DisplaySettings> = new BehaviorSubject<DisplaySettings>(this._settings);
  public readonly settingsChanged$: Observable<DisplaySettings> = this.settingsChangedSource.asObservable();
}
