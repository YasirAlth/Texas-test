import { NgModule } from '@angular/core';
import { MapToArrayPipe } from './map-to-array/map-to-array';
import { RemoveLocalSourceFilterPipe } from './remove-local-source-filter/remove-local-source-filter';
import {FilterIncidentsPipe} from './filter-incidents.pipe';
import {OrderByTimestampPipe} from './order-by-timestamp.pipe';

@NgModule({
  declarations: [MapToArrayPipe, RemoveLocalSourceFilterPipe, FilterIncidentsPipe, OrderByTimestampPipe],
  imports: [],
  exports: [MapToArrayPipe, RemoveLocalSourceFilterPipe, FilterIncidentsPipe, OrderByTimestampPipe]
})
export class PipesModule {}
