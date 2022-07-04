import { NgModule } from '@angular/core';
import { SettingsPage } from './settings';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {RouterModule} from '@angular/router';
import {ConnectionStatusModule} from '../../components/connection-status/connection-status.module';

@NgModule({
  declarations: [
    SettingsPage
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: SettingsPage
      }
    ]),
    ConnectionStatusModule
  ],
})
export class SettingsPageModule {}
