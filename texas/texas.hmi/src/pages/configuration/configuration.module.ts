import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigurationPage } from './configuration';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from './material.module';
import {MatInputModule} from '@angular/material/input';
import {ConnectionStatusModule} from '../../components/connection-status/connection-status.module';

@NgModule({
  declarations: [
    ConfigurationPage
  ],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    RouterModule.forChild([
      {
        path: '',
        component: ConfigurationPage
      }
    ]),
    MaterialModule,
    ReactiveFormsModule,
    MatInputModule,
    ConnectionStatusModule
  ]
})
export class ConfigurationPageModule { }
