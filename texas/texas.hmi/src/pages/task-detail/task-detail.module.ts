import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { TaskDetailPage } from './task-detail.page';
import {AngularOpenlayersModule} from 'ngx-openlayers';
import {DistanceToPipe} from '../../pipes/distance-to/distance-to.pipe';
import {TaskEventsComponent} from '../../components/task-events/task-events.component';
import {TaskAssignmentComponent} from "../../components/task-assignment/task-assignment.component";
import {DirectivesModule} from "../../directives/directives.module";
import {ContainsSourceFilterPipe} from "../../pipes/contains-source-filter";
import {IsManualTrackFilter} from "../../pipes/is-manual-track-filter";

const routes: Routes = [
  {
    path: '',
    component: TaskDetailPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    AngularOpenlayersModule,
    DirectivesModule
  ],
  declarations: [TaskDetailPage, DistanceToPipe, TaskEventsComponent, TaskAssignmentComponent, ContainsSourceFilterPipe, IsManualTrackFilter]
})
export class TaskDetailPageModule {}
