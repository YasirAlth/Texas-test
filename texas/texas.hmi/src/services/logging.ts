import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';
import AllDbs from 'pouchdb-all-dbs';
import { ConfigService } from './config';
import {Observable, Subject} from 'rxjs';

// Services to log
// import { Geolocation, Geoposition } from '@ionic-native/geolocation';
// import { DeviceOrientation } from '@ionic-native/device-orientation';
import { LocationService } from './location';
import {Channel, LasagneService} from './lasagne';
import { ErrorService } from './error';
import {TraccarProvider} from './traccar';
import {Platform} from '@ionic/angular';
import {Network} from '@ionic-native/network/ngx';
import {BatteryStatus} from '@ionic-native/battery-status/ngx';
import {Device} from '@ionic-native/device/ngx';
import {filter, map} from 'rxjs/operators';
import {isNullOrUndefined} from "../functions/Utils";

declare let SignalStrength: any;

class LogItem {
  _id: string;
  data: any;

  constructor(deviceId: string, event: string, data: any) {
    this.data = data;
    // Guids were suggested but TS/js doesnt actually have built in guid support
    // and seeing as we have a large amount of events this could be more unique
    this._id = deviceId + '/' + event + '/' + (new Date()).toISOString();
  }
}

// If pouchdb npm package fails to install you may need this as a prereq (on windows)
// npm install -g windows-build-tools

@Injectable()
export class LoggingService {

  private readonly UPDATE_INTERVAL = 60 * 1000; // 1 minute

  private deviceId: string;
  private db: PouchDB.Database;

  private lastLogTimes: { [ eventType: string ]: number } = {};
  private deferredLogs: Array<LogItem> = [];

  private _syncInProgress = false;

  constructor(
    private deviceService: Device,
    private platformService: Platform,
    private configService: ConfigService,
    private locationService: LocationService,
    private batteryStatus: BatteryStatus,
    private lasagneService: LasagneService,
    private errorService: ErrorService,
    private network: Network,
    private traccar: TraccarProvider,
  ) {
    if (this.platformService.is('cordova')) {
      this.deviceId = this.deviceService.serial === 'unknown' || isNullOrUndefined(this.deviceService.serial) ? this.deviceService.uuid : this.deviceService.serial;
      console.log('SERIAL = ' + this.deviceId);
      console.log('YUUUID = ' + this.deviceService.uuid);
    } else {
      this.deviceId = 'browser-debug';
    }

    if (this.platformService.is('cordova')) {
      if (this.deviceService.serial === null) {
        this.errorService.log('Device serial is null on LoggingService initialization, some early logs may be missed.');
        // deviceId was not set (deviceService hasn't initialized the values)
        // periodically check the until the device service is set up
        const deviceInitTimer = window.setInterval(() => {
          if (this.deviceService.serial !== null) {
            // setup data/events & cancel timer
            this.deviceId = this.deviceService.serial;
            this.setupDB();
            this.logCommonEvents();
            this.logDeviceOnlyEvents();
            clearInterval(deviceInitTimer);
          }
        }, 100);
      } else {
        // setup data/events immediately
        this.deviceId = this.deviceService.serial;
        this.setupDB();
        this.logCommonEvents();
        this.logDeviceOnlyEvents();
      }
    } else {
      // Browser: only use the common log events
      this.deviceId = 'browser-debug';
      this.setupDB();
      this.logCommonEvents();
    }
  }

  public get syncInProgress(): boolean {
    return this._syncInProgress;
  }

  private setupDB(): void {
    AllDbs(PouchDB);
    const dbName: string = this.deviceId + (new Date()).toISOString();
    this.db = new PouchDB(dbName, {
      adapter: 'idb',
      revs_limit: 1
      // auto_compaction: true
    });
  }

  public syncDatabaseToServer(): Promise<boolean> {
    if (!this.syncInProgress) {
      this._syncInProgress = true;
      const syncStart = Date.now();
      return (PouchDB as any).allDbs().then(async (dbs: Array<string>): Promise<boolean> => {
        const remoteDb = new PouchDB(this.configService.settings.couchDatabaseServer + '/device-' + this.deviceId.toLowerCase());
        for (let i = 0; i < dbs.length; i++) {
          console.log('began upload of ' + dbs[i]);
          try {
            await (new PouchDB(dbs[i])).replicate.to(remoteDb, {
              batch_size: 500,
              back_off_function(delay) {
                if (delay > 0) {
                  return delay * 1.5;
                }
                return 1000;
              }
            });
            console.log('successfully synced ' + dbs[i] + '\t' + (i + 1) + '/' + dbs.length);
          } catch (err) {
            this.errorService.log('Error syncing log ' + dbs[i], true);
            remoteDb.close();
            // re-throw so it is caught by the promise
            throw err;
          }
        }
        remoteDb.close();
        this._syncInProgress = false;
        const syncTime = Date.now() - syncStart;
        console.log('Sync action took: ' + syncTime + 'ms');
        this.addDeferredLogs();
        return true;
      }).catch(err => {
        this.errorService.log('Failed to sync all logs to server', true);
        this._syncInProgress = false;
        const syncTime = Date.now() - syncStart;
        console.log('Sync action took: ' + syncTime + 'ms');
        this.addDeferredLogs();
        return false;
      });
    }
  }

  /**
   * Subscribe to events and log the objects.
   *
   * @param observerable the obserable to subscribe to
   * @param eventType string type of the event
   * @param minimumPeriod milliseconds of minimum delay between logs (i.e. to help filter out high frequency events)
   * @param eventParser implement this if event objects need to be adapted before being logged e.g. TrackManagerEvent
   */
  private logEvents<T>(observerable: Observable<T>, eventType: string, minimumPeriod?: number, eventParser?: (T) => any): void {
    // initial log time
    this.lastLogTimes[eventType] = 0;

    // skip all events if sync is not in progress
    observerable.pipe(
    filter(event => (!minimumPeriod) || (Date.now() > (this.lastLogTimes[eventType] + minimumPeriod))),
        map((event: T) => eventParser ? eventParser(event) : event),
        map(data => new LogItem(this.deviceId, eventType, Object.assign({}, data))))
        .subscribe(log => {
      this.lastLogTimes[eventType] = Date.now();
      if (this.syncInProgress) {
        // this will be added later
        this.deferredLogs.push(log);
      } else {
        this.db.put(log).catch(error => {
          console.log('Logging error:');
          console.log(error);
          this.errorService.log(error.message);
          this.deferredLogs.push(log);
        });
      }
    });
  }

  /**
   * This function can be used to store logs that are ignored due to a sync being in progress.
   * Call this after a sync has finished.
   */
  private addDeferredLogs() {
    if (this.deferredLogs.length > 0) {
      console.log('Storing logs that were skipped due to sync');
      // put logs that were not added into the database
      this.deferredLogs.forEach(log => this.db.put(log).catch(error => {
        console.log('Logging error: (deferred log)');
        console.log(error);
        this.errorService.log(error.message + ' (deferred log)');
      }));
      this.deferredLogs = [];
    }
  }

  private logCommonEvents(): void {
    // log these as events come
    this.logEvents(this.configService.settingsChanged$, 'settings');
    this.logEvents(this.errorService.errorChannel$, 'error', 0, (message: string) => ({ message }));
    this.logEvents(this.lasagneService.getChannel$(Channel.Control, false), 'lasagne/control/incoming');
    this.logEvents(this.lasagneService.getChannel$(Channel.Alerts, false), 'lasagne/alerts/incoming');
    this.logEvents(this.lasagneService.getChannel$(Channel.Tracks, false), 'lasagne/tracks/incoming');
    this.logEvents(this.lasagneService.getChannel$(Channel.Control, true), 'lasagne/control/outgoing');
    this.logEvents(this.lasagneService.getChannel$(Channel.Alerts, true), 'lasagne/alerts/outgoing');
    this.logEvents(this.lasagneService.getChannel$(Channel.Tracks, true), 'lasagne/tracks/outgoing');

    // Traccar Tracks
    this.logEvents(this.traccar.owntrackUpdate, 'traccar/ownship');
    this.logEvents(this.traccar.tracksUpdate, 'traccar/tracks');


    // log location every minute
    this.logEvents(this.locationService.locationChange$, 'location', this.UPDATE_INTERVAL);
  }

  private logDeviceOnlyEvents(): void {
    // Log device properties once
    this.db.put(new LogItem(this.deviceId, 'device/start', {
      manufacturer: this.deviceService.manufacturer,
      cordova: this.deviceService.cordova,
      model: this.deviceService.model,
      platform: this.deviceService.platform,
      serial: this.deviceService.serial,
      version: this.deviceService.version
    }));

    const networkSubject = new Subject();
    // Watch network for a connection
    this.network.onChange().subscribe(() => {
      // (From Ionic:) We just got a connection but we need to wait briefly
      // before we determine the connection type. Might need to wait.
      // prior to doing any api requests as well.
      window.setTimeout(() => networkSubject.next({ type: this.network.type }), 1000);
    });

    this.logEvents(networkSubject.asObservable(), 'device/network');
    this.logEvents(this.locationService.headingChange$, 'device/heading', this.UPDATE_INTERVAL, (value: number) => ({ heading: value }));
    this.logEvents(this.batteryStatus.onChange(), 'device/battery', this.UPDATE_INTERVAL);

    // No typings for the Signal Strength plugin
    if (typeof SignalStrength !== 'undefined') {
      const signalStrengthSubject = new Subject();
      // Note: no period for log events need to be set as the signal strength will only update every minute
      this.logEvents(signalStrengthSubject.asObservable(), 'device/signal');
      // setup timer to check signal strength
      window.setInterval(() => SignalStrength.dbm(measuredDbm => signalStrengthSubject.next({dbm: measuredDbm})), this.UPDATE_INTERVAL);
    } else {
      console.log('Could not get signal strength plugin :(');
    }
  }

}
