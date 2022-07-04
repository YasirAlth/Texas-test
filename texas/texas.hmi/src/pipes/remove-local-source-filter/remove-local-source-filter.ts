import { Pipe, PipeTransform } from '@angular/core';
import {Source} from '../../enums/source';

@Pipe({
  name: 'removeLocalSourceFilter',
})
export class RemoveLocalSourceFilterPipe implements PipeTransform {

  // Removes Source.Local from the source list.
  transform(allSources: Source[]) {
    return allSources.filter( source => source !== Source.Local);
  }
}
