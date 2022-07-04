import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { SaContainerPage } from './sa-container.page';
import {ConnectionStatusModule} from '../../components/connection-status/connection-status.module';
import {PipesModule} from '../../pipes/pipes.module';
import {DirectivesModule} from "../../directives/directives.module";

/**
 * Routes for this container.
 */
const routes: Routes = [
  {
    path: '',
    component: SaContainerPage,
    children:
      [
        {
          path: '',
          redirectTo: 'map',
          pathMatch: 'full'
        },
        { path: 'map',  loadChildren: () => import('../map/map.module').then(m => m.MapPageModule) },
        { path: 'map/:lat/:lon',  loadChildren: () => import('../map/map.module').then(m => m.MapPageModule) },
        { path: 'alerts', loadChildren: () => import('../alerts/alerts.module').then(m => m.AlertsPageModule) },
        { path: 'alert-detail/:alertId', loadChildren: () => import('../alert-detail/alert-detail.module').then(m => m.AlertDetailPageModule) },
        { path: 'task-detail/:alertId/:taskId/:displayAssignment',  loadChildren: () => import('../task-detail/task-detail.module').then(m => m.TaskDetailPageModule) },
        { path: 'tasks',  loadChildren: () => import('../tasks/tasks.module').then(m => m.TasksPageModule) },
        { path: 'incidents',  loadChildren: () => import('../incident-updates/incident-updates.module').then(m => m.IncidentUpdatesPageModule) },
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
    ConnectionStatusModule,
    PipesModule,
    DirectivesModule
  ],
  declarations: [SaContainerPage]
})
export class SaContainerPageModule {}
