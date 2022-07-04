import { NgModule } from '@angular/core';
import { AboutPage} from './about';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {RouterModule} from '@angular/router';
import {ConnectionStatusModule} from '../../components/connection-status/connection-status.module';

@NgModule({
  declarations: [
    AboutPage
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: AboutPage
      }
    ]),
    ConnectionStatusModule
  ],
})
export class AboutPageModule {}
