import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { AlertDetailPage } from './alert-detail.page';
import {DirectivesModule} from "../../directives/directives.module";

const routes: Routes = [
  {
    path: '',
    component: AlertDetailPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    DirectivesModule,
  ],
  declarations: [AlertDetailPage]
})
export class AlertDetailPageModule {}
