import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { EcContainerPage } from './ec-container.page';
import {ConnectionStatusModule} from "../../components/connection-status/connection-status.module";

/*
* Routes for the Experimental Control container.
*/

const routes: Routes = [
  {
    path: '',
    component: EcContainerPage,
    children:
      [
        {
          path: '',
          redirectTo: 'experimental-control',
          pathMatch: 'full',
        },
        { path: 'experimental-control', loadChildren: () => import('../experimental-control/log-activity/experimental-control.module').then(m => m.ExperimentalControlPageModule)},
        { path: 'mission-data-control', loadChildren: () => import('../experimental-control/mission-data-control/mission-data-control.module').then(m => m.MissionDataControlPageModule)}
      ]
  },
  {
    path: '',
    redirectTo: 'sa-container/map',
    pathMatch: 'full',
  }
];


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    ConnectionStatusModule
  ],
  declarations: [EcContainerPage]
})
export class EcContainerPageModule {}
