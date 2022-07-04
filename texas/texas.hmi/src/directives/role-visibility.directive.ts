import {Directive, Input, TemplateRef, ViewContainerRef} from '@angular/core';
import {NgIf} from '@angular/common';
import {Role, RoleService} from '../services/role.service';
import {ConfigService} from '../services/config';
import {Subscription} from 'rxjs';

@Directive({
  selector: '[roleVisibility]'
})
export class RoleVisibilityDirective {

  private readonly ngIf: NgIf;

  private sub: Subscription = new Subscription();

  @Input()
  public set roleVisibility(roles: string[]) {
    this.sub.add(this.config.settingsChanged$.subscribe(settings => {
      this.ngIf.ngIf = this.accessService.hasRoles(roles);
    }));
  }

  constructor(private templateRef: TemplateRef<any>, private viewContainer: ViewContainerRef, private accessService: RoleService, private config: ConfigService) {
    this.ngIf = new NgIf(this.viewContainer, this.templateRef);
  }

  OnDestroy() {
    this.sub.unsubscribe();
  }
}
