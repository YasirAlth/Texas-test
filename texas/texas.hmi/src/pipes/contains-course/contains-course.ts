import { Pipe, PipeTransform } from '@angular/core';
import {TrackMarker} from '../../pages/map/track-marker';
import {isNullOrUndefined} from "../../functions/Utils";

@Pipe({
  name: 'containsCourse',
})
export class ContainsCoursePipe implements PipeTransform {

  transform(tracks: TrackMarker[]) {
    return isNullOrUndefined(tracks) ? [] : tracks.filter( track => track.courseSvg !== null);
  }
}
