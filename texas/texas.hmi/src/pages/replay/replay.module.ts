import { NgModule } from '@angular/core';
import { ReplayPage } from './replay';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {RouterModule} from '@angular/router';
import {ConnectionStatusModule} from '../../components/connection-status/connection-status.module';

@NgModule({
  declarations: [
    ReplayPage
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ReplayPage
      }
    ]),
    ConnectionStatusModule
  ],
})
export class ReplayPageModule {}
