import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RoleVisibilityDirective} from './role-visibility.directive';



@NgModule({
  declarations: [RoleVisibilityDirective],
  imports: [
    CommonModule
  ],
  exports: [
    RoleVisibilityDirective
  ]
})
export class DirectivesModule { }
