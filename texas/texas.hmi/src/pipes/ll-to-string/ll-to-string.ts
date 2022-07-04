import {Pipe, PipeTransform} from '@angular/core';
import * as _ from 'lodash';
import {LatLon} from '../../interfaces';

/**
 * Converts a lla to string representation.
 */
@Pipe({name: 'llToString'})
export class LatLonToStringPipe implements PipeTransform {

  /**
   * performs the transformation.
   * @param ll - the ll to be converted to string.
   */
  transform(ll: LatLon): string {
    return '(' + _.round(ll.lat, 3) + ', ' + _.round(ll.lon, 3) + ')';
  }
}
