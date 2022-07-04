import {Component} from '@angular/core';
import {Platform, ToastController} from '@ionic/angular';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {OwnTrackService} from '../services/own-track';
import {ConfigService} from '../services/config';
import {Autostart} from '@ionic-native/autostart/ngx';
import {LasagneService} from '../services/lasagne';
import {LoggingService} from '../services/logging';
import {AlertMenuSettingsService} from '../services/alert-menu-settings';
import {ContextualAlertService} from '../services/contextual-alerts';
import {BackgroundMode} from '@ionic-native/background-mode/ngx';
import {PowerManagement} from '@ionic-native/power-management/ngx';
import {ContextualAlertNotificationService} from '../services/context-alert-notification';
import {BehaviorSubject} from 'rxjs';
import {isNullOrUndefined} from '../functions/Utils';
import * as _ from 'lodash';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {

  private appPages = [
    {
      title: 'Map',
      url: '/sa-container'
    },
    {
      title: 'Tracks',
      url: '/track-list'
    },
    {
      title: 'Chat',
      url: '/chat'
    },
    {
      title: 'Experimental Control',
      url: '/ec-container',
      roles: ['experimentalControl']
    },
    {
      title: 'Settings',
      url: '/settings'
    },
    {
      title: 'Replay',
      url: '/replay',
      roles: ['replayControl']
    },
    {
      title: 'Configuration',
      url: '/configuration'
    },
    {
      title: 'About',
      url: '/about'
    }
  ];

  pagesSubject = new BehaviorSubject<any>(this.appPages);
  pages$ = this.pagesSubject.asObservable();


  private connectionError = false;
  private lastToastMessage = null;

  constructor(public platform: Platform,
              public ownTrackService: OwnTrackService,
              public statusBar: StatusBar,
              public splashScreen: SplashScreen,
              public toastCtrl: ToastController,
              public loggingService: LoggingService,
              private lasagneService: LasagneService,
              private autoStart: Autostart,
              private config: ConfigService,
              private alertMenuSettingsService: AlertMenuSettingsService,
              private powerManagement: PowerManagement,
              private backgroundMode: BackgroundMode,
              private taskingService: ContextualAlertService,
              private notificationService: ContextualAlertNotificationService) {

    this.initializeApp();

    this.autoStart.enable();
  }

  initializeApp() {

    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();

      this.config.settingsChanged$.subscribe(settings => {
        this.pagesSubject.next(_.clone(this.appPages));
      });

      // ------ Subscription: Lasagne Connected ------

      this.lasagneService.connectionChanged$.subscribe(async (connected: boolean) => {
        if (connected) {
          if (this.connectionError) {
            if (this.lastToastMessage) {
              // dismiss last message to only allow there to be 1 connection message at a time
              // note: this will not clear last LASAGNE report, trianglation or alert message
              this.lastToastMessage.dismiss();
            }
            // Create a toast showing success.
            this.lastToastMessage = await this.toastCtrl.create({
              message: 'Server connection successful',
              duration: 3000,
              showCloseButton: true,
              closeButtonText: 'Ok',
              position: 'bottom',
              color: 'success'
            });
            this.lastToastMessage.present();
          }
          // Remember state.
          this.connectionError = false;
        } else if (this.connectionError === false) {

          // Show a message notifying of error.
          this.lastToastMessage = await this.toastCtrl.create({
            message: 'Error connecting to Server',
            showCloseButton: true,
            closeButtonText: 'Ok',
            position: 'bottom',
            color: 'danger'
          });
          await this.lastToastMessage.present();

          // Remember state.
          this.connectionError = true;
        }
      });

      if (this.platform.is('android')) {
        // this.backgroundMode.enable();

        const release = () => {
          this.powerManagement.release().then(() => {
            console.log('Wakelock released');
          }, () => {
            console.log('Failed to release wakelock');
          });

          setTimeout(acquire, 1000 * 60 * 3);
        };


        const acquire = () => {
          this.powerManagement.dim().then(() => {
            console.log('Wakelock acquired');
          }, () => {
            console.log('Failed to acquire wakelock');
          });
          setTimeout(release, 1000);
        };

        release();

        this.powerManagement.setReleaseOnPause(false).then(() => {
          console.log('setReleaseOnPause successfully');
        }, () => {
          console.log('Failed to set setReleaseOnPause');
        });
      }
    });
  }
}
