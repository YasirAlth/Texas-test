import { Pipe, PipeTransform } from '@angular/core';
import {LatLon} from '../../interfaces/lat-lon';
import * as _ from 'lodash';

/**
 * Generated class for the MapToArrayPipe pipe.
 *
 * See https://angular.io/api/core/Pipe for more info on Angular Pipes.
 */
@Pipe({
  name: 'mapToArray',
})
export class MapToArrayPipe implements PipeTransform {

  transform(object: any): any {
    let retVal = [];
    for (var key in object) {
      retVal.push(object[key])
    }
    return retVal;
  }
}
