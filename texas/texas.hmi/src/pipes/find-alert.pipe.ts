import {Pipe, PipeTransform} from '@angular/core';
import {ContextualAlert} from '../interfaces';

@Pipe({ name: 'findAlert' })
export class FindAlertPipe implements PipeTransform {
  transform(alerts: ContextualAlert[], id: string) {
    return alerts.find( a => a.id === id);
  }
}
