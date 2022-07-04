import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { IncidentUpdatesPage } from './incident-updates.page';
import {PipesModule} from '../../pipes/pipes.module';
import {FindAlertPipe} from '../../pipes/find-alert.pipe';

const routes: Routes = [
  {
    path: '',
    component: IncidentUpdatesPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    PipesModule
  ],
  declarations: [IncidentUpdatesPage, FindAlertPipe]
})
export class IncidentUpdatesPageModule {}
