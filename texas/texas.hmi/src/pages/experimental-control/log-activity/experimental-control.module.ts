import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExperimentalControlPage } from './experimental-control';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { TimeModalPage } from './control-modals/time-modal-page';
import { TextInputModalPage } from './control-modals/text-input-modal';
import { FormsModule } from '@angular/forms';
import {PipesModule} from "../../../pipes/pipes.module";


@NgModule({
  declarations: [
    ExperimentalControlPage,
    TimeModalPage,
    TextInputModalPage
  ],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ExperimentalControlPage
      }
    ]),
    FormsModule,
    PipesModule
  ],
  entryComponents: [
    TimeModalPage,
    TextInputModalPage
  ]
})
export class ExperimentalControlPageModule { }
