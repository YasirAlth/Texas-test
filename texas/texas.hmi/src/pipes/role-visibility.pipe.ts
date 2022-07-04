import { Pipe, PipeTransform } from '@angular/core';
import {RoleService} from '../services/role.service';
import {isNullOrUndefined} from '../functions/Utils';

@Pipe({
  name: 'roleVisibility'
})
export class RoleVisibilityPipe implements PipeTransform {

  constructor(private accessService: RoleService) {
  }

  transform(items: any[], ...args: any[]): any {
    return items.filter(item => {
      if (isNullOrUndefined(item.roles)) {
        return true;
      } else {
        return this.accessService.hasRoles(item.roles);
      }
    });
  }
}
