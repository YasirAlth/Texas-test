import { Injectable } from '@angular/core';
import {ConfigService} from './config';
import {MissionDataService} from './mission-data.service';

/**
 * Loads the alert settings from file
 * NOTE: This will be remove when config is loaded from CouchDB (TEXAS-61)
 */
@Injectable({
  providedIn: 'root'
})
export class AlertMenuSettingsService {

  // The alert menu settings.
  private settings: any = [];

  constructor(private config: ConfigService,
              private missionData: MissionDataService) {

  }

  /**
   * Returns the alert menu settings.
   */
  public async getSettings(): Promise<Array<any>> {
    if (this.settings.length === 0) {
      try {
        const result = await this.missionData.getMissionData<any>('alert-settings');
        this.settings = result.alertSettings;
      } catch (error) {
        console.error(`Could not get alert menu data from remote source, using local menu data ${error}`);
        this.settings = require('../assets/mission-data-defaults/alert-settings.json');
      }
    }

    return this.settings;
  }
}
