import { Pipe, PipeTransform } from '@angular/core';
import {TrackRecord} from '../../classes/TrackRecord';
import {ConfigService} from '../../services/config';

/**
 * Pipe to filter out the Ownship from a given list of tracks.
 */
@Pipe({
  name: 'owntrackFilter',
})
export class OwntrackFilterPipe implements PipeTransform {
  constructor(public configService: ConfigService) {
  }

  transform(tracks: Array<TrackRecord>) {
    return tracks.filter( track => track.getLatestTrack().deviceId !== this.configService.settings.deviceId);
  }
}
