import { NgModule } from '@angular/core';
import { MapPage } from './map';
import {AngularOpenlayersModule} from 'ngx-openlayers';
import {FilterComponent} from '../../components/filter/filter';
import {MarkerConfigComponent} from '../../components/marker-config/marker-config';
import {WeatherComponent} from '../../components/weather/weather';
import {PipesModule} from '../../pipes/pipes.module';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {RouterModule} from '@angular/router';
import {ContainsCoursePipe} from '../../pipes/contains-course/contains-course';
import {TooltipsModule} from 'ionic-tooltips';
import {NgMathPipesModule} from 'angular-pipes';
import {DirectivesModule} from "../../directives/directives.module";

@NgModule({
  declarations: [
    MapPage,
    FilterComponent,
    MarkerConfigComponent,
    WeatherComponent,
    ContainsCoursePipe
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    NgMathPipesModule,
    RouterModule.forChild([
      {
        path: '',
        component: MapPage
      }
    ]),
    AngularOpenlayersModule,
    PipesModule,
    TooltipsModule.forRoot(),
    NgMathPipesModule,
    DirectivesModule
  ]
})
export class MapPageModule {}
