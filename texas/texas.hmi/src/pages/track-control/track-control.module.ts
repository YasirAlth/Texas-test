import { NgModule } from '@angular/core';
import { TrackControlPage } from './track-control';
import {PipesModule} from '../../pipes/pipes.module';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {RouterModule} from '@angular/router';

@NgModule({
  declarations: [
    TrackControlPage,
  ],
  imports: [
    PipesModule,
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: TrackControlPage,
      }
    ])
  ],
})
export class TrackControlPageModule {}
