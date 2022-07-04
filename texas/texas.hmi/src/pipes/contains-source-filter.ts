import { Pipe, PipeTransform } from '@angular/core';
import {Source} from "../enums/source";
import {TrackRecord} from "../classes/TrackRecord";

@Pipe({
  name: 'containsSourceFilter',
})
export class ContainsSourceFilterPipe implements PipeTransform {

  // Removes Source.Local from the source list.
  transform(tracks: TrackRecord[], source: Source) {
    return tracks.filter( track => track.getLatestTrack().source.includes(source));
  }
}
