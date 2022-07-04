import { Pipe, PipeTransform } from '@angular/core';
import {ExpLogDataEntry} from '../interfaces/exp-log-data';

@Pipe({
  name: 'orderByTimestamp'
})
export class OrderByTimestampPipe implements PipeTransform {
  transform(value: any[], ...args: any[]): any {
    return value.sort((a, b) => {
     return new Date(a.timestamp).valueOf() - new Date(b.timestamp).valueOf();
    });
  }
}
