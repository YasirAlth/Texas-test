import {Injectable} from '@angular/core';
import {Source} from '../enums/source';
import {LatLon, Settings, Track} from '../interfaces';
import {ConfigService} from './config';
import {LocationService} from './location';
import {Channel, LasagneService} from './lasagne';
import {copyTrack} from '../functions/TrackUtils';
import {isNullOrUndefined} from '../functions/Utils';
import {BehaviorSubject, fromEvent, Observable, timer} from 'rxjs';
import {TraccarProvider} from './traccar';
import {BatteryStatus} from '@ionic-native/battery-status/ngx';

/**
 * This service fuses information pertaining to the current device to form the "own track" information.
 *
 * Subscriptions:
 *
 *   - ConfigService
 *       - SettingsChanged
 *           - Used to fuse deviceId and deviceName into self track
 *
 *   - LocationService
 *       - PositionChanged
 *           - Used to fuse Lat/Lon into self track
 *
 *       - HeadingChanged
 *           - Used to fuse the heading into self track
 *
 * Publications:
 *
 *   - Rxjs & LasagneService
 *       - OwnTrackChanged
 *           - Notify when Owntrack is updated
 *           - Notify that Owntrack is still active
 *                by publishing at a constant time interval (PUBLISH_INTERVAL_MILLISECONDS)
 *
 */
@Injectable()
export class OwnTrackService {

  private static readonly PUBLISH_INTERVAL_MILLISECONDS = 250;

  // Initial definition of own track, based on known current settings
  // Note: settings may not be created when this is loaded (i.e. async)
  private readonly selfTrack: Track = {
    source: [Source.Local],
    primarySource: Source.Lasagne,
    deviceId: '', // this.config.settings.deviceId,
    deviceName: '', // this.config.settings.deviceName,
    position: { lat: -34.9199763, lon: 138.6057124 } as LatLon,
    heading: undefined,
    active: true,
    categoryId: 0,
    agencyId: 0,
    timestamp: new Date(0),
    type: 'ASSET',
    updateRate: 0, // this.config.settings.selfTrackUpdateRate,
    battery: 100,
    whiteList: '', // this.config.settings.trackPrefixWhitelist
  } as Track;

  get position(): LatLon {
    return this.selfTrack.position;
  }
  set position(position: LatLon) {
    if (this.manualPosition) {
      // manual position override
      this.selfTrack.position = position;
      this.ownTrackChangedSource.next(copyTrack(this.selfTrack));
    }
  }

  private readonly ownTrackChangedSource: BehaviorSubject<Track> = new BehaviorSubject<Track>(copyTrack(this.selfTrack));
  public readonly ownTrackChanged$: Observable<Track> = this.ownTrackChangedSource.asObservable();

  private autoUpdateRate: number;
  private randomMovement: boolean;
  private manualPosition: boolean;

  constructor(
    private config: ConfigService,
    private location: LocationService,
    private lasagne: LasagneService,
    private batteryStatus: BatteryStatus,
    private traccar: TraccarProvider) {

    this.traccar.owntrackUpdate.subscribe((data: any) => {

      if (this.selfTrack.primarySource === Source.Traccar) {
        this.selfTrack.position = data.position;
        this.selfTrack.active = true;
      }

      if (!this.selfTrack.source.includes(Source.Traccar)) {
        this.selfTrack.source.push(Source.Traccar);
      }

      // Notify listeners
      this.ownTrackChangedSource.next(copyTrack(this.selfTrack));
    });

    // ------ Update Timer ------


    timer(0, OwnTrackService.PUBLISH_INTERVAL_MILLISECONDS)
      .subscribe(() => {

        const waitTime = this.selfTrack.updateRate > 0 ? this.selfTrack.updateRate : this.autoUpdateRate;
        const expiryTime = Date.now() - waitTime;

        if (expiryTime > this.selfTrack.timestamp.valueOf()) {

          this.selfTrack.timestamp = new Date();

          if (this.randomMovement) {
            this.selfTrack.position.lat += (Math.random() - 0.5) * 0.01;
            this.selfTrack.position.lon += (Math.random() - 0.5) * 0.01;
          }

          // Notify listeners
          this.ownTrackChangedSource.next(copyTrack(this.selfTrack));

          // Publish over LASAGNE
          this.lasagne.publish(Channel.Tracks, copyTrack(this.selfTrack));
        }
      });


    // ------ Subscription: Settings Changed ------

    // On settings change, update own track, and notify listeners
    this.config.settingsChanged$.subscribe((settings: Settings) => {
      if (isNullOrUndefined(settings)) { return; }

      // Update internal state
      this.selfTrack.deviceId = settings.deviceId;
      this.selfTrack.deviceName = settings.deviceName;
      this.selfTrack.updateRate = settings.selfTrackUpdateRate;
      this.selfTrack.whiteList = settings.trackPrefixWhitelist;
      this.selfTrack.categoryId = settings.categoryId;
      this.selfTrack.agencyId = settings.agencyId;
      this.selfTrack.primarySource = settings.primarySource;
      // this.selfTrack.timestamp = new Date(); // Always update the timestamp!

      // Turn random movement on/off (for testing only)
      this.randomMovement = settings.developerMode === 'R';
      this.manualPosition = settings.developerMode === 'M';

      // Notify listeners
      this.ownTrackChangedSource.next(copyTrack(this.selfTrack));
    });

    // ------ Subscription: GPS Power Mode Changed ------

    // On power mode change, update which refers to the low/high update rates
    this.location.powerModeChange$.subscribe((mode: string) => {
      switch (mode) {
        case 'low':
          this.autoUpdateRate = this.config.settings.maximumTrackUpdateRate;
          break;
        case 'high':
          this.autoUpdateRate = this.config.settings.minimumTrackUpdateRate;
          break;
      }
    });


    // ------ Subscription: Position Changed ------

    // On position change, update own track, and notify listeners
    this.location.locationChange$.subscribe((coords: Coordinates) => {

      if (!this.randomMovement && !this.manualPosition) {

        if (this.selfTrack.primarySource === Source.Lasagne) {

          // Update internal state
          this.selfTrack.position = {lat: coords.latitude, lon: coords.longitude} as LatLon;

          this.selfTrack.course = coords.heading;
          const maxAccuracy = 1000;
          this.selfTrack.posAccuracy = coords.accuracy > maxAccuracy ? maxAccuracy : coords.accuracy;
          this.selfTrack.active = true;
          // this.selfTrack.timestamp = new Date(); // Always update the timestamp!
        }

        // TODO this is a bit confusing because it's not REALLY LASAGNE?
        if (!this.selfTrack.source.includes(Source.Lasagne)) {
          this.selfTrack.source.push(Source.Lasagne);
        }

        // Notify listeners
        this.ownTrackChangedSource.next(copyTrack(this.selfTrack));
      }
    });


    // ------- Subscription: Heading Changed ------

    // On heading change, update own track, and notify listeners
    this.location.headingChange$.subscribe((heading: number) => {

      // Update internal state
      this.selfTrack.heading = heading;
      this.selfTrack.active = true;
      // this.selfTrack.timestamp = new Date();  // Always update the timestamp!

      // Notify listeners
      this.ownTrackChangedSource.next(copyTrack(this.selfTrack));

    });

    // See here: https://github.com/ionic-team/ionic-native/issues/2972
    fromEvent(window, 'batterystatus').subscribe((status: any ) => {
      this.selfTrack.battery = status.level;
    });
  }

  updatePrimarySource(source: Source) {
    this.selfTrack.primarySource = source;
  }
}
