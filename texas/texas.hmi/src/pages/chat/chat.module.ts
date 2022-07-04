import { NgModule } from '@angular/core';
import { ChatPage } from './chat';
import {SafeUrlPipe} from '../../pipes/safe-url/safe-url';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {RouterModule} from '@angular/router';
import {SafeUrlModule} from '../../pipes/safe-url/safe-url.module';
import {ConnectionStatusModule} from '../../components/connection-status/connection-status.module';

@NgModule({
  declarations: [
    ChatPage
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SafeUrlModule,
    RouterModule.forChild([
      {
        path: '',
        component: ChatPage
      }
    ]),
    ConnectionStatusModule
  ],
})
export class ChatPageModule {}
