import { Injectable } from '@angular/core';
import {Subject, Observable, timer} from 'rxjs';
import { Source } from '../enums/source';
import { OwnTrackService } from './own-track';
import { LatLon } from '../interfaces';
import { Track } from '../interfaces';
import {Channel, LasagneService} from './lasagne';
import { EventType } from '../enums/event-type';
import { copyTrack } from '../functions/TrackUtils';
import {ConfigService} from './config';
import { isNullOrUndefined } from '../functions/Utils';

export interface ManualTrackEvent {
  eventType: EventType;
  track: Track;
}

/**
 * This service manages manual tracks that have been created on the current device
 *
 * Publications:
 *   - Rxjs & LasagneService
 *       - ManualTrackEvent
 *           - Notify when manual track is added or removed
 *           - Periodically publish all manual tracks at a constant time
 *                 interval (PUBLISH_INTERVAL_MILLISECONDS) to indicate still active
 */
@Injectable()
export class ManualTrackService {

  constructor(
    private lasagne: LasagneService,
    private ownTrackService: OwnTrackService,
    private configService: ConfigService
  ) {

    // ------ Update Timer ------
    timer(0, ManualTrackService.PUBLISH_INTERVAL_MILLISECONDS)
      .subscribe(() => {

        this.tracks.forEach(t => {

          t.timestamp = new Date(); // TODO prefer to change this to timestamp_tx

          // Notify listeners
          this.fireTrackChangedEvent(EventType.UPDATED, t);

          // Publish over LASAGNE
          this.lasagne.publish(Channel.Tracks, copyTrack(t));

        });

      });

    // ------ Subscription: Own Track ------

    // On own track changed, update the local cache with the new value
    this.ownTrackService.ownTrackChanged$.subscribe(ownTrack => {
      // check for changes
      if (this.deviceId !== ownTrack.deviceId || this.deviceName !== ownTrack.deviceName) {
        // update names (and IDs - but that shouldn't usually change)
        this.tracks.forEach(t => {
          const count = ManualTrackService.getCountForManualTrack(t);
          t.deviceId = ManualTrackService.generateTrackId(ownTrack.deviceId, count);
          t.deviceName = ManualTrackService.generateTrackName(ownTrack.deviceName, count, this.whitelist);
        });
      }

      this.deviceId = ownTrack.deviceId;
      this.deviceName = ownTrack.deviceName;
    });

    // ------ Subscription: Settings ------

    this.configService.settingsChanged$.subscribe(settings => {
      if (isNullOrUndefined(settings)) { return; }
      // check for changes
      if (this.whitelist !== settings.trackPrefixWhitelist) {
        // update names
        this.tracks.forEach(t => {
          const count = ManualTrackService.getCountForManualTrack(t);
          t.deviceName = ManualTrackService.generateTrackName(this.deviceName, count, settings.trackPrefixWhitelist);
        });
      }
      this.whitelist = settings.trackPrefixWhitelist;
    });

  }

  private static readonly PUBLISH_INTERVAL_MILLISECONDS = 2000;

  private readonly tracks: Array<Track> = [];

  private readonly trackChangedSource: Subject<ManualTrackEvent> = new Subject<ManualTrackEvent>();
  public readonly trackChange$: Observable<ManualTrackEvent> = this.trackChangedSource.asObservable();

  // Variables provided from own track service & config service
  private deviceId: string;
  private deviceName: string;
  private whitelist: string;

  private count = 0; // Count used in the id/name of manual tracks

  private static generateTrackId(deviceId: string, count: number) {
    return deviceId + '-man-' + count;
  }

  private static generateTrackName(deviceName: string, count: number, prefixlist: string) {
    const prefix = prefixlist === undefined ? undefined : prefixlist.split(',')[0]; // use only first prefix in list
    const deviceNamePrefix = prefix ? (prefix + '-') : ''; // prefix or empty
    return deviceNamePrefix + 'Manual : ' + deviceName + ' : ' + count;
  }

  public static getDeviceIdForManualTrack(manualTrack: Track): string {
    return manualTrack.deviceId.split('-', 2)[0];
  }

  public static getDeviceNameForManualTrack(manualTrack: Track): string {
    return manualTrack.deviceName.split(':', 3)[1].slice(1);
  }

  public static getCountForManualTrack(manualTrack: Track): number {
    return Number(manualTrack.deviceId.split('-', 3)[2]);
  }

  public addManualTrack(location: LatLon, manualStyle?: string) {

    // Create an id for the track using the device id and counter
    // Use the device name & counter for the track name
    const count = ++this.count;
    const id = ManualTrackService.generateTrackId(this.deviceId, count);
    const name = ManualTrackService.generateTrackName(this.deviceName, count, this.configService.settings.trackPrefixWhitelist);

    const track = {
      source: [Source.Local],
      primarySource: Source.Lasagne,
      deviceId: id,
      deviceName: name,
      position: location,
      heading: undefined,
      active: true,
      timestamp: new Date(0),
      type: manualStyle || 'MAN',
      updateRate: ManualTrackService.PUBLISH_INTERVAL_MILLISECONDS,
      whiteList: '',
      battery: 100
    } as Track;

    this.tracks.push(track);

    this.fireTrackChangedEvent(EventType.ADDED, track);

  }

  public contains(deviceId: string) {
    return this.tracks.findIndex(t => t.deviceId === deviceId) > -1;
  }

  public removeManualTrack(deviceId: string) {

    const index = this.tracks.findIndex(t => t.deviceId === deviceId);

    if (index > -1) {
      this.fireTrackChangedEvent(EventType.REMOVED, this.tracks[index]);

      // Publish deleted manual track over LASAGNE
      const deletedTrack = copyTrack(this.tracks[index]);
      deletedTrack.type = 'DEL';
      deletedTrack.timestamp = new Date();
      this.lasagne.publish(Channel.Tracks, deletedTrack);

      this.tracks.splice(index, 1);
    }

  }

  private fireTrackChangedEvent(eventType: EventType, track: Track) {
    this.trackChangedSource.next({
      eventType,
      track: copyTrack(track)
    } as ManualTrackEvent);
  }
}
