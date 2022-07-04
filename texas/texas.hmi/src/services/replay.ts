import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Observable, Subscription, timer} from 'rxjs';
import { ConfigService } from './config';
import { isNullOrUndefined } from '../functions/Utils';
import { Storage } from '@ionic/storage';

export class ReplaySession {
  readonly id: string;
  readonly start: string;
  readonly end: string;
}

export interface ReplaySettings {
  enabled: boolean;
  session: ReplaySession;
}

@Injectable()
export class ReplayService {
  private static readonly STORAGE_KEY = 'replay-settings';
  private sessionsSubscription: Subscription;

  private _settings: ReplaySettings = {
    enabled: false,
    session: undefined
  };

  sessions;

  constructor(
    private readonly http: HttpClient,
    private readonly storage: Storage,
    private readonly config: ConfigService) {
      this.loadSettings(); // load settings from local storage
    }

  get settings(): ReplaySettings {
    return this._settings;
  }

  set settings(settings: ReplaySettings) {
    this._settings = settings;
    this.saveSettings();
  }

  getSessions(): Observable<ReplaySession[]> {
    const url = encodeURI(`${this.config.settings.texasReplayServer}/replay/info`);
    console.log(`${ReplayService.name}::getSessions() - GET: ${url}`);
    return this.http.get<ReplaySession[]>(url);
  }

  loadSettings() {
    this.storage.get(ReplayService.STORAGE_KEY)
      .then(settings => {
        if (settings != null) {
          this.settings = settings;
          console.log('loaded replay settings from local storage: ', this._settings);
        }
      });
    }

  saveSettings() {
    this.storage.set(ReplayService.STORAGE_KEY, this._settings);
    console.log('saved replay settings to local storage: ', this._settings);

    if (this._settings.enabled) {
      // update sessions list on a timer (TODO not effecient!)
      this.sessionsSubscription = timer(0, 5000).subscribe(() => {
        this.getSessions().subscribe(sessions => {
          this.sessions = sessions;
        });
      });
    } else if (!isNullOrUndefined(this.sessionsSubscription) && !this.sessionsSubscription.closed) {
      this.sessionsSubscription.unsubscribe();
    }
  }
}
