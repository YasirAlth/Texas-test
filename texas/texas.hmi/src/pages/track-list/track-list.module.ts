import { NgModule } from '@angular/core';
import { TrackListPage } from './track-list';
import {LatLonToStringPipe} from '../../pipes/ll-to-string/ll-to-string';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {RouterModule} from '@angular/router';
import {OwntrackFilterPipe} from '../../pipes/owntrack-filter/owntrack-filter';
import {ConnectionStatusModule} from '../../components/connection-status/connection-status.module';
import {DirectivesModule} from "../../directives/directives.module";

@NgModule({
  declarations: [
    TrackListPage,
    LatLonToStringPipe,
    OwntrackFilterPipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: TrackListPage
      }
    ]),
    ConnectionStatusModule,
    DirectivesModule,
  ],
})
export class TrackListPageModule {}
