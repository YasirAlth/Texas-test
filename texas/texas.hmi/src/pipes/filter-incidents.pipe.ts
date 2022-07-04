import {Pipe, PipeTransform} from '@angular/core';
import {IncidentReport} from '../interfaces';
import {UpdateState} from '../enums/update-state';

@Pipe({ name: 'filterIncidents' })
export class FilterIncidentsPipe implements PipeTransform {
  transform(incidents: IncidentReport[], filter: UpdateState[] = [UpdateState.Unactioned]) {
    return incidents.filter(incident => {
      let found = false;
      filter.forEach(f => {
        if (incident.state === f) {
          found = true;
        }
      });
      return found;
    });
  }
}
