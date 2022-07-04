import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import {LoggingService} from '../services/logging';
import {ConfigService} from '../services/config';
import {TextToSpeech} from '@ionic-native/text-to-speech/ngx';
import {AppVersion} from '@ionic-native/app-version/ngx';
import {OwnTrackService} from '../services/own-track';
import {TrackManagerService} from '../services/track-manager';
import {LocationService} from '../services/location';
import {FiltersService} from '../services/filters';
import {ContextualAlertNotificationService} from '../services/context-alert-notification';
import {Network} from '@ionic-native/network/ngx';
import {PrefixWhitelistService} from '../services/prefix-whitelist';
import {AudioService} from '../services/audio';
import {AlertMenuSettingsService} from '../services/alert-menu-settings';
import {ReplayService} from '../services/replay';
import {ContextualAlertService} from '../services/contextual-alerts';
import {NgxsModule} from '@ngxs/store';
import {NgxsReduxDevtoolsPluginModule} from '@ngxs/devtools-plugin';
import {ContextualAlertState} from '../states/contextual-alert.state';
import {TriangulationProvider} from '../services/triangulation';
import {LasagneService} from '../services/lasagne';
import {Vibration} from '@ionic-native/vibration/ngx';
import {FusionProvider} from '../services/fusion';
import {DisplayConfigService} from '../services/display-config';
import {ErrorService} from '../services/error';
import {TraccarProvider} from '../services/traccar';
import {QueryService} from '../services/query';
import {BatteryStatus} from '@ionic-native/battery-status/ngx';
import {WeatherProvider} from '../services/weather';
import {ManualTrackService} from '../services/manual-tracks';
import {Geolocation} from '@ionic-native/geolocation/ngx';
import {DeviceOrientation} from '@ionic-native/device-orientation/ngx';
import {Autostart} from '@ionic-native/autostart/ngx';
import {Device} from '@ionic-native/device/ngx';
import {BackgroundMode} from '@ionic-native/background-mode/ngx';
import {IonicStorageModule} from '@ionic/storage';
import {HttpClientModule} from '@angular/common/http';
import {PowerManagement} from '@ionic-native/power-management/ngx';
import {WeatherInfoPageModule} from '../pages/weather-info/weather-info.module';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {FormsModule} from '@angular/forms';
import { CanActivateRouteGuardService } from 'src/guards/can-activate-route-guard.service';
import { ServiceWorkerModule } from '@angular/service-worker';
import { ExperimentalLoggingService } from 'src/services/experimental-logging';
import { environment } from '../environments/environment';
import {AddNewTaskComponent} from '../components/add-new-task/add-new-task.component';
import {AddTaskNoteComponent} from '../components/add-task-note/add-task-note.component';
import {ExperimentalLoggingState} from '../states/experimental-logging.state';
import {IncidentReportState} from '../states/incident-report.state';
import { RoleVisibilityPipe } from '../pipes/role-visibility.pipe';
import {AddAlertLatLonComponent} from "../components/add-alert-latlon/add-alert-lat-lon.component";

@NgModule({
  declarations: [AppComponent, AddTaskNoteComponent, AddNewTaskComponent, RoleVisibilityPipe, AddAlertLatLonComponent],
  entryComponents: [AddTaskNoteComponent, AddNewTaskComponent, AddAlertLatLonComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    IonicStorageModule.forRoot(),
    HttpClientModule,
    WeatherInfoPageModule,
    BrowserAnimationsModule,
    // See here for registrationStrategy https://stackoverflow.com/questions/53329924/angular-7-service-worker-not-registered
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production, registrationStrategy: 'registerImmediately' }),
    NgxsModule.forRoot([
      ContextualAlertState,
      ExperimentalLoggingState,
      IncidentReportState
    ]),
    NgxsReduxDevtoolsPluginModule.forRoot(),
    FormsModule],
  providers: [
    Device,
    BackgroundMode,
    PowerManagement,
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    LoggingService,
    ConfigService,
    DisplayConfigService,
    ErrorService,
    TrackManagerService,
    LocationService,
    Geolocation,
    DeviceOrientation,
    LasagneService,
    ContextualAlertNotificationService,
    QueryService,
    OwnTrackService,
    PrefixWhitelistService,
    ManualTrackService,
    AudioService,
    BatteryStatus,
    Network,
    Vibration,
    AppVersion,
    Autostart,
    WeatherProvider,
    FiltersService,
    TextToSpeech,
    TraccarProvider,
    FusionProvider,
    AlertMenuSettingsService,
    ReplayService,
    CanActivateRouteGuardService,
    ContextualAlertService,
    ExperimentalLoggingService,
    TriangulationProvider
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
