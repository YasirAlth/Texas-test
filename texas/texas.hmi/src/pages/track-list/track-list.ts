import {Component, OnDestroy, OnInit} from '@angular/core';
import { TrackManagerService, TrackManagerEvent } from '../../services/track-manager';
import { Track } from '../../interfaces';
import { TrackRecord } from '../../classes/TrackRecord';
import { EventType } from '../../enums/event-type';
import { OwnTrackService } from '../../services/own-track';
import {ConfigService} from '../../services/config';
import { Subscription } from 'rxjs';
import {Source} from '../../enums/source';
import {filter} from 'rxjs/operators';

@Component({
  selector: 'page-about',
  templateUrl: 'track-list.html'
})
export class TrackListPage implements OnInit, OnDestroy {

  private readonly trackRecords: Array<TrackRecord> = [];
  private readonly tracks: Array<Track> = [];

  public activeTrackCount = 0;

  // The track representing this device (provided by OwnTrackService)
  owntrack: Track;

  subscriptions = new Subscription();

  // Required for type use within the template.
  SourceType = Source;

  constructor(
    private trackManager: TrackManagerService,
    private ownTrackService: OwnTrackService,
    public configService: ConfigService
  ) {
    this.trackRecords = this.trackManager.tracks;
  }

  ngOnInit() {
    // ------ Subscription: Own Track ------
    // On own track changed, update the local cache with the new value
    this.subscriptions.add(this.ownTrackService.ownTrackChanged$.subscribe(track => this.owntrack = track));

    // ------ Subscription: Track Manager ------
    this.subscriptions.add(this.trackManager.trackChange$.pipe(
      filter(e => e.trackRecord.getLatestTrack().deviceId !== this.owntrack.deviceId))
      .subscribe((e: TrackManagerEvent) => {

        switch (e.eventType) {
          case EventType.ADDED:
          case EventType.UPDATED:
            this.updateTrack(e.trackRecord.getLatestTrack());
            break;
          case EventType.REMOVED:
            this.removeTrack(e.trackRecord.getLatestTrack().deviceId);
            break;
        }
      })
    );

    // ------ Initialise Members ------
    // Note: this must be done after subscriptions

    this.trackManager.tracks
      .filter(t => t.getLatestTrack().deviceId !== this.owntrack.deviceId)
      .forEach(t => this.updateTrack(t.getLatestTrack()));

    this.activeTrackCount = this.tracks.filter(t => t.active).length;
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  // new code
  getTracks() {
    return this.trackManager.tracks;
  }

  private updateTrack(track: Track): void {

    const index = this.tracks.findIndex(t => t.deviceId === track.deviceId);

    if (index > -1) {
      // Track exists in list, update it
      this.tracks[index] = track;
    } else {
      // Track does not exist in list, add it
      this.tracks.push(track);
    }

    // Sort Track list alphabetically
    this.tracks.sort((a, b) => {
      if (a.active === b.active) {
        return a.deviceName.localeCompare(b.deviceName);
      } else if (a.active === true) {
        return -1;
      } else {
        return 1;
      }
    });

    // calculate the active track count (not including self track)
    this.activeTrackCount = this.tracks.filter(t => t.active).length;
  }

  // used by html
  public updateRateLabel(updateRate: number): string {
    return updateRate > 0 ? updateRate + 'ms' : 'Auto';
  }

  private removeTrack(deviceId: string): void {

    const index = this.tracks.findIndex(t => t.deviceId === deviceId);

    if (index > -1) {
      this.tracks.splice(index, 1);
    }
  }

  sendControl(deviceId: string) {
    // TODO NAV this.navCtrl.push('TrackControlPage', {deviceId});
  }

  clear(deviceId: string) {
    this.trackManager.removeInactiveTrack(deviceId);
  }

  sourceToString(sources: Source[]): string {
    let retVal = '';
    sources.forEach( (source => {
      retVal += `${Source[source]}, `;
    }));
    return retVal.substring(0, retVal.length - 2);
  }

  filterOwnTrack() {
   return this.trackRecords.filter((track: TrackRecord) => {
     return track.getLatestTrack().deviceId !== this.owntrack.deviceId;
   });
  }

}
