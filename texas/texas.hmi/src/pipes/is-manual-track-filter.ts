import { Pipe, PipeTransform } from '@angular/core';
import {Source} from "../enums/source";
import {TrackRecord} from "../classes/TrackRecord";
import {ManualTrackService} from "../services/manual-tracks";

@Pipe({
  name: 'isManualTrackFilter',
})
export class IsManualTrackFilter implements PipeTransform {

  constructor( private manualTracksService: ManualTrackService) {

  }
  // Removes Source.Local from the source list.
  transform(tracks: TrackRecord[], isNot: boolean = false) {
    return tracks.filter( track => this.manualTracksService.contains(track.getLatestTrack().deviceId) === isNot);
  }
}
