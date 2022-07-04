import {Injectable} from '@angular/core';
import {Track} from '../interfaces';
import {Channel, LasagneService} from './lasagne';
import {Observable, ReplaySubject, Subject, timer} from 'rxjs';
import {OwnTrackService} from './own-track';
import {PrefixWhitelistService} from './prefix-whitelist';
import {EventType} from '../enums/event-type';
import {ManualTrackEvent, ManualTrackService} from './manual-tracks';
import {TrackRecord} from '../classes/TrackRecord';
import {ConfigService} from './config';
import {FiltersService} from './filters';
import {Filter} from '../interfaces';
import {Replay} from '../interfaces';
import {Source} from '../enums/source';
import {ReplayService} from './replay';
import {TraccarProvider} from './traccar';
import {FusionProvider} from './fusion';
import { filter} from 'rxjs/operators';
import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';

PouchDB.plugin(PouchFind);

export interface TrackManagerEvent {
  eventType: EventType;
  trackRecord: TrackRecord;
}

/**
 * This service fuses all track information and distributes it to listeners (e.g. HMI components)
 *
 * Subscriptions:
 *
 *   - OwnTrackService
 *       - TrackChanged
 *           - Used to update locally created own track
 *
 *   - ManualTrackService
 *       - TrackChanged
 *           - Used to update locally created manual tracks
 *
 *   - LasagneService
 *       - getChannel$<Track>(LasagneService.CHANNEL_TRACKS)
 *           - Used to update tracks from other devices (via. LASAGNE)
 *       - getChannel$<Replay>(LasagneService.CHANNEL_REPLAY)
 *           - Used to clear the track manager when the replay is 'reset'
 *
 *   - PrefixWhiteListService
 *       - prefix white list
 *           - Used to remove tracks that have been white listed
 *
 *   - FiltersService
 *       - filters list
 *           - Used to update tracks that have been filtered
 *
 * Publications:
 *
 *   - Rxjs
 *       - TrackChange
 *           - Notify when a TrackRecord is updated
 *
 */
@Injectable()
export class TrackManagerService {

  private static readonly millisecondsToTrackUpdate = 2000;

  public tracks: Array<TrackRecord> = [];
  private whitelistedMap: Map<string, boolean> = new Map<string, boolean>();

  // The track representing this device (provided by OwnTrackService)
  private owntrack: Track;

  // store the last 10 events within a 10 second window time
  private readonly trackChangedSource: Subject<TrackManagerEvent> = new ReplaySubject<TrackManagerEvent>(10, 10000);
  public readonly trackChange$: Observable<TrackManagerEvent> = this.trackChangedSource.asObservable();


  trackHistorySubject = new Subject<any>();
  trackHistory$ = this.trackHistorySubject.asObservable();

  constructor(
    private config: ConfigService,
    private lasagneService: LasagneService,
    private ownTrackService: OwnTrackService,
    private prefixWhiteListService: PrefixWhitelistService,
    private manualTrackService: ManualTrackService,
    private filtersService: FiltersService,
    private traccar: TraccarProvider,
    private fusion: FusionProvider,
    private replayService: ReplayService
  ) {

    // ------ Subscription: Filters ------

    this.filtersService.filtersChanged$.subscribe((filters: Array<Filter>) => {

      this.tracks
        .filter(t => t.getLatestTrack().deviceId !== this.owntrack.deviceId)
        .forEach((t: TrackRecord) => {

          const index = filters.findIndex((f: Filter) => f.category.categoryId === t.getLatestTrack().categoryId);
          if (index > -1) {
            const oldValue = t.filtered;
            const newValue = t.filtered = filters[index].filtered;

            if (oldValue !== newValue) {
              this.fireTrackManagerEvent(EventType.UPDATED, t);
            }
          }

        });
    });

    // ------ Subscription: Prefix whitelist ------

    // On settings change, update the prefix whitelist
    this.prefixWhiteListService.prefixWhitelistChange$.subscribe((prefixWhitelist: Array<string>) => {

      // update tracks whitelist property
      this.tracks
        .filter(t => t.getLatestTrack().deviceId !== this.owntrack.deviceId)
        .forEach((t: TrackRecord) => {

          this.whitelistedMap[t.getLatestTrack().deviceId] = this.prefixWhiteListService.onWhiteList(t.getLatestTrack().deviceName);
          // if a device is not in the white list, remove its track
          if (this.whitelistedMap[t.getLatestTrack().deviceId] == false) {
            this.removeTrack(t.getLatestTrack().deviceId);
          }
        });

    });

    // ------ Subscription: Own Track ------

    // On own track changed, update the local cache with the new value
    this.ownTrackService.ownTrackChanged$.subscribe(track => {
      this.owntrack = track;
      this.updateTrack(track);
    });

    // ------ Subscription: LASAGNE Tracks ------

    // On Lasagne tracks received, update tracks in the cache
    this.lasagneService.getChannel$<Track>(Channel.Tracks).pipe(

      // Only include external tracks (i.e., ignore self track so the source is not overridden)
      filter(track => track.deviceId != this.owntrack.deviceId && this.prefixWhiteListService.onWhiteList(track.deviceName) && !this.manualTrackService.contains(track.deviceId)))

      // Update filtered tracks from LASAGNE
      .subscribe(track => this.updateTrack(track));

    // ------ Subscription: LASAGNE Replay -----

    // On Lasagne replay received, clear the tracks
    this.lasagneService.getChannel$<Replay>(Channel.Replay)

      // Remove all tracks in the manager
      .subscribe(replay => {
       // if(!replay.start) {
          console.log('Replay mode changed, remove all tracks');
          // delete all items in the tracks array...
          this.tracks.length = 0;
          console.log(this.tracks.length);
          this.removeAllTracks();
        // }
      });

    // ------ Subscription: Manual Tracks ------

    // On own track changed, update the local cache with the new value
    this.manualTrackService.trackChange$.subscribe((e: ManualTrackEvent) => {
      switch (e.eventType) {
        case EventType.ADDED:
        case EventType.UPDATED:
          this.updateTrack(e.track);
          break;
        case EventType.REMOVED:
          this.removeTrack(e.track.deviceId);
          break;
      }
    });

    this.traccar.tracksUpdate.pipe(
      // Only include external tracks (i.e., ignore self track so the source is not overridden)
      filter(track => track.deviceId != this.config.settings.traccarTrackerId && this.prefixWhiteListService.onWhiteList(track.deviceName) && !this.manualTrackService.contains(track.deviceId)))
      .subscribe(track => this.updateTrack(track));

    // ------ Update Timer -------


    timer(0, TrackManagerService.millisecondsToTrackUpdate)
      .subscribe(() => {

        const history = [];

        this.tracks
          .filter(t => t.getLatestTrack().active && t.getLatestTrack().deviceId !== this.owntrack.deviceId)
          .forEach((t: TrackRecord) => {

            const track = t.getLatestTrack();
            // wait for the max amount for assets (useful for auto mode / when values are changed)
            const waitTime = track.type === 'ASSET' ? this.config.settings.maximumTrackUpdateRate : track.updateRate;
            // expiry period is 1.5x the wait time
            const expiryTime = Date.now() - 1.5 * waitTime;

            // If the track has expired, deactivate it
            if (expiryTime > track.timestamp.valueOf()) {
              t.setActive(false);
              this.fireTrackManagerEvent(EventType.UPDATED, t);
            }

            history.push(...t.getHistory());
          });

        this.trackHistorySubject.next([...history]);
      });

    // Once in the constructor should be enough.
    this.loadRemoteTracks();
  }

  /**
   * Loads the remote tracks from the CouchDB database.
   */
  private async loadRemoteTracks() {
    try {
       await this.config.configLoaded;

      // Handle on the remote database.
      const couch = new PouchDB(this.config.settings.couchDatabaseServer + '/tracksamqp');

      // Create a search index based on timestamp.
      couch.createIndex({
        index: {
          fields: ['timestamp']
        }
      }).then(() => {
        // If a track was updated within this time period then include it in the search.
        const updateThreshold = 1; // minutes.
        const time = new Date();

        // Adjust the search time to some time in the past/
        time.setMinutes(time.getMinutes() - updateThreshold);

        // Perform the search.
        couch.find({
          selector: {
            timestamp: {$gt: time},
          }
        }).then((data) => {
          // Cast away the pouch-ness.
          const tracks: any[]  = (data.docs as any).filter(track => {
            return track.deviceId !== this.owntrack.deviceId && this.prefixWhiteListService.onWhiteList(track.deviceName) && !this.manualTrackService.contains(track.deviceId)
          });

          // Iterate the results.
          tracks.forEach((track: Track) => {
            // Make the track timestamp  'now' so it remains.
            track.timestamp = new Date();

            // Remove the local source and then exclude if no other sources.
            track.source = track.source.filter(source => source !== Source.Local);
            if (track.source.length > 0) {

              // Update the track.
              this.updateTrack(track);
            }
          });
        }).catch(e => {
          console.error('Error running database query: ' + e);
        });
      }).catch(e => {
        console.error('Error creating database index: ' + e);
      });

      couch.close();

    } catch (e) {
      console.error(`Error loading remote tracks from CouchDB at the address ${this.config.settings.couchDatabaseServer}. Make sure this address is valid and available.`);
      console.error(e);
    }
  }

  public removeInactiveTrack(deviceId: string): void {
    const track = this.tracks.find(t => t.getLatestTrack().deviceId === deviceId);
    if (track && track.getLatestTrack().active == false) {
      // track exists, and is not active: call internal remove function
      this.removeTrack(deviceId);
    }
  }

  public contains(deviceId: string) {
    return this.tracks.findIndex(t => t.getLatestTrack().deviceId === deviceId) > -1;
  }

  private removeTrack(deviceId: string): void {
    console.log('remove track:' + deviceId);
    const index = this.tracks.findIndex(t => t.getLatestTrack().deviceId === deviceId);

    if (index > -1) {
      const removedTrack = this.tracks.splice(index, 1)[0];
      removedTrack.dispose(); // this will clear its subscription(s)
      this.fireTrackManagerEvent(EventType.REMOVED, removedTrack);
    }
  }

  private removeAllTracks() {
    for (const track of this.tracks) {
      this.removeTrack(track.getLatestTrack().deviceId);
    }
  }

  private updateTrack(track: Track): void {

    // REPLAY SPECIFIC CODE TODO TIDY UP
    if (this.replayService.settings.enabled) {
      const trackAsAny = track as any;
      const sessionId = this.replayService.settings.session;
      if (!trackAsAny.hasOwnProperty('replaySessionId')) {
        // track is not from replay, ignore
        console.log('ignoring track, replay mode is enabled and this track does not contain a replay session id');
        return;
      } else if (trackAsAny.replaySessionId !== sessionId) {
        // ignore, tracks replay session is incorrect
        console.log(`ignoring track, replay session is ${sessionId}, track belongs to ${trackAsAny.replaySessionId}`);
        return;
      }
    }

    if (!track.deviceId) {
      return;
    }

    track = this.fusion.fuseTrack(track);

    const index = this.tracks.findIndex((t: TrackRecord) => t.getLatestTrack().deviceId === track.deviceId);
    let trackUpdate: TrackRecord;

    if (index >= 0) {

      // let oldTrackTime = this.tracks[index].getLatestTrack().timestamp.valueOf();
      // let newTrackTime = track.timestamp.valueOf();

      // if (newTrackTime >= oldTrackTime) {
      if (track.type === 'DEL') {
        this.removeTrack(track.deviceId);
      } else {
        // Update track record...
        trackUpdate = this.tracks[index];
        trackUpdate.addTrackReport(track);
        trackUpdate.setActive(true);
        this.fireTrackManagerEvent(EventType.UPDATED, trackUpdate);
      }

    } else {

      switch (track.type) {
        case 'DEL':
          console.warn('Received a deleted manual track which was not previously known.');
          return;
        case 'MAN':
        case 'TRI':
          if (!track.source.includes(Source.Local)
            && ManualTrackService.getDeviceIdForManualTrack(track) === this.config.settings.deviceId) {
            // this is a manual track for this device from Lasagne, ignore by returning here
            console.warn('Received external new manual track provided by this device. Track ignored (' + track.deviceId + ')');
            return;
          }
          break;
        default:
          // continue on
          break;
      }

      // Create and add new track record...
      trackUpdate = new TrackRecord(this.config, track);
      this.tracks.push(trackUpdate);
      trackUpdate.setActive(true);
      this.fireTrackManagerEvent(EventType.ADDED, trackUpdate);

    }
  }

  private fireTrackManagerEvent(eventType: EventType, trackRecord: TrackRecord) {
    this.trackChangedSource.next({
      eventType,
      trackRecord
    } as TrackManagerEvent);
  }
}
