import { NgModule } from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {ConnectionStatusComponent} from './connection-status.component';

@NgModule({
  declarations: [
    ConnectionStatusComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ],
  exports: [ConnectionStatusComponent]
})
export class ConnectionStatusModule {}
