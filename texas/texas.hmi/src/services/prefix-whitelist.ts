
import { Injectable } from '@angular/core';
import {Observable, Subject} from 'rxjs';
import { ConfigService } from './config';
import { Settings } from '../interfaces';
import { isNullOrUndefined } from '../functions/Utils';

/**
 * This service maintains a list of strings for the purpose of matching against in order
 * to create an intended "whitelist" (i.e. tracks matching the prefix constraints).
 *
 * Publications:
 *
 *   - Rxjs
 *       - TrackChange
 *           - Notify when a TrackRecord is updated
 *
 */
@Injectable()
export class PrefixWhitelistService {

  private readonly prefixWhitelistChangedSource: Subject<Array<string>> = new Subject<Array<string>>();
  public readonly prefixWhitelistChange$: Observable<Array<string>> = this.prefixWhitelistChangedSource.asObservable();

  // A list of prefixes of tracks to include in the map of tracks (provided by ConfigService)
  private prefixWhitelist: Array<string>;

  constructor(
    private config: ConfigService
  ) {

    // this.prefixWhitelist = this.config.settings.trackPrefixWhitelist.split(',');

    // ------ Subscription: Settings ------

    // On settings change, update the prefix whitelist
    this.config.settingsChanged$.subscribe((settings: Settings) => {
      if (isNullOrUndefined(settings)) { return; }

      // update prefix whitelist
      this.prefixWhitelist = settings.trackPrefixWhitelist.split(',');

      // notify listeners of the change
      this.prefixWhitelistChangedSource.next(this.prefixWhitelist);
    });
  }

  public onWhiteList(value: string): boolean {

    for (const prefix of this.prefixWhitelist) {

      // value is on the whitelist, return true
      if (value.startsWith(prefix)) { return true; }

    }

    // value is not on the whitelist, return false
    return false;
  }

}
