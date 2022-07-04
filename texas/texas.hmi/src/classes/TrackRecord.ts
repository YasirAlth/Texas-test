import { Track } from '../interfaces';
import { ConfigService } from '../services/config';
import { Settings } from '../interfaces';
import {BehaviorSubject, Subject, Subscription} from 'rxjs';
import { Source } from '../enums/source';
import { isNullOrUndefined } from '../functions/Utils';
import * as _ from 'lodash';

export class TrackRecord {

  private history: Array<Track> = [];
  private historySub = new BehaviorSubject<Array<Track>>([]);
  public history$ = this.historySub.asObservable();

  private historyPosition: [number, number][] = [];
  private historyPositionSub = new BehaviorSubject<[number, number][]>([]);
  public historyPosition$ = this.historyPositionSub.asObservable();

  private latestTrack: Track;

  private expireTime: number;
  private historyTimeouts: Array<number> = [];

  private _filtered: boolean;

  private sub: Subscription;

  public get filtered() {
    return this._filtered;
  }

  public set filtered(value: boolean) {
    this._filtered = value;
  }

  constructor(
    private config: ConfigService,
    track: Track) {

    this.expireTime = this.config.settings.trackHistoryExpiry;

    // ------ Subscription: Settings Changed ------

    // On settings change, update own track, and notify listeners
    this.sub = this.config.settingsChanged$.subscribe((settings: Settings) => {
      if (isNullOrUndefined(settings)) { return; }
      this.expireTime = settings.trackHistoryExpiry;
      this.pruneTrackHistory();
    });

    this.addTrackReport(track);

    setInterval(() => {
      this.historyPositionSub.next(_.cloneDeep(this.historyPosition));
      this.historySub.next(_.cloneDeep(this.history));
    }, 1000);
  }

  public dispose() {
    this.sub.unsubscribe();
  }

  public addTrackReport(track: Track) {

    this.latestTrack = track;

    // accept track into history if it is external OR is the first track
    const accept = !track.source.includes(Source.Local) || !this.history[0];
    // OTHERWISE must be later than the minimum update rate
    if (accept || track.timestamp.getTime() > this.history[0].timestamp.getTime() + this.config.settings.minimumTrackUpdateRate) {

      // append to start of track
      this.history.unshift(track);
      this.historyPosition.unshift([track.position.lon, track.position.lat]);

      // add timer to track
      this.addTrackexpiryTimer();
    }

  }

  public getHistory(): Array<Track> {
    return this.history;
  }

  public getLatestTrack(): Track {
      return this.latestTrack;
  }

  public setActive(active: boolean): void {
      this.history.forEach((track: Track) => track.active = active);
  }

  private addTrackexpiryTimer(remainingTime?: number) {
    // add timer for track
    this.historyTimeouts.push(window.setTimeout(() => {
      this.history.pop(); // remove oldest track
      this.historyPosition.pop();
      this.historyTimeouts = this.historyTimeouts.slice(1); // remove most recent timeout
    }, remainingTime || this.expireTime));
  }

  private pruneTrackHistory() {
    // clear timers, we're going to re-add them
    this.historyTimeouts.forEach(t => clearTimeout(t));
    this.historyTimeouts = [];

    const historyExpiry = Date.now() - this.expireTime;
    for (let index = 0; index < this.history.length; index++) {
      const track = this.history[index];
      const remainingTime = track.timestamp.getTime() - historyExpiry;
      if (remainingTime > 0) {
        // for every remaining track, add a timer with the remaining time
        this.addTrackexpiryTimer(remainingTime);
      } else {
        // cut off the end tracks (assume its sorted - it should be)
        this.history.splice(index);
        this.historyPosition.slice(index);

        break;
      }
    }
  }
}
