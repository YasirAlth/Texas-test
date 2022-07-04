import { Pipe, PipeTransform } from '@angular/core';
import {LatLon} from '../../interfaces';
import {LatLonSpherical} from 'geodesy';

/**
 * A pipe to return the distance between two lat lons.
 */
@Pipe({
  name: 'distanceTo'
})
export class DistanceToPipe implements PipeTransform {
  transform(a: LatLon, b?: LatLon): any {
    return new LatLonSpherical(a.lat, a.lon).distanceTo(new LatLonSpherical(b.lat, b.lon));
  }
}
