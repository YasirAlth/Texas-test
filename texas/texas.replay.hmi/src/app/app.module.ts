import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule, MatCardModule, MatCheckboxModule, MatDialogModule,
  MatFormFieldModule, MatIconModule, MatInputModule, MatOptionModule,
  MatMenuModule, MatSelectModule, MatSliderModule,
  MatToolbarModule, MatListModule} from '@angular/material';
import { HttpClientModule } from '@angular/common/http';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ReplayService } from './services/replay.service';
import { ReplayComponent } from './components/replay/replay.component';
import { MenuComponent } from './components/menu/menu.component';
import { NewReplayDialogComponent } from './components/new-replay-dialog/new-replay-dialog.component';
import { OpenReplayDialogComponent } from './components/open-replay-dialog/open-replay-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    ReplayComponent,
    MenuComponent,
    NewReplayDialogComponent,
    OpenReplayDialogComponent
  ],
  entryComponents: [
    NewReplayDialogComponent,
    OpenReplayDialogComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    LoggerModule.forRoot({
      level: NgxLoggerLevel.INFO
    }),
    // Angular Material modules must be imported after BrowserModule
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatOptionModule,
    MatMenuModule,
    MatSelectModule,
    MatSliderModule,
    MatToolbarModule
  ],
  providers: [
    ReplayService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
