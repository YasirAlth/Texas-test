import {Component, OnDestroy, OnInit} from '@angular/core';
import { Settings } from '../../interfaces';
import { ConfigService } from '../../services/config';
import {Channel, LasagneService} from '../../services/lasagne';
import {TrackControl} from '../../interfaces';
import { Subscription } from 'rxjs';
import { LoggingService } from '../../services/logging';
import { isNullOrUndefined } from '../../functions/Utils';
import {AlertController, NavController} from '@ionic/angular';

@Component({
  selector: 'page-settings',
  templateUrl: 'settings.html'
})
export class SettingsPage implements OnInit, OnDestroy {

  password = '';
  correctPassword = 'ok texas';

  settings: Settings;
  fixedDeviceId: boolean;
  subscriptions = new Subscription();
  syncFail = false;

  public readonly developerOptions = [
    {
      label: 'Off',
      value: '',
    },
    {
      label: 'Random Movement',
      value: 'R',
    },
    {
      label: 'Manual Positioning',
      value: 'M',
    },
  ];

  constructor(
    public navCtrl: NavController,
    private config: ConfigService,
    public popupController: AlertController,
    private lasagne: LasagneService,
    public logging: LoggingService
  ) {
    this.subscriptions.add(this.config.settingsChanged$.subscribe((settings: Settings) => {
      if (isNullOrUndefined(settings)) { return; }
      this.settings = settings;
    }));
    // unable to modify deviceId if is on device
    this.fixedDeviceId = this.config.isOnDevice();
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  change(): void {
    this.config.settings = this.settings;
  }

  async reset(): Promise<void> {
    const popup = await this.popupController.create({
      header: 'Revert Settings',
      message: 'This will revert settings to the default for your device.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Revert',
          role: 'revert',
          handler: () => {
            this.config.setSettingsFromDefaults();
          }
        }
      ]
    });

    popup.present();
  }

  async reconfigure() {
    const popup = await this.popupController.create({
      header: 'Reconfigure System?',
      message: 'This will reconfigure settings to ALL devices.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reconfigure',
          role: 'reconfigure',
          handler: () => {
            this.config.getDefaultTrackConfig().subscribe( async (data: any) => {
              for (let i = 0; i < data.tracks.length; i++) {
                const settings = await this.config.getSettingsForDevice(data, data.tracks[i].deviceId, true);
                const controlMessage: TrackControl = {
                  deviceId: settings.deviceId,
                  deviceName: settings.deviceName,
                  categoryId: settings.categoryId,
                  agencyId: settings.agencyId,
                  updateRate: settings.selfTrackUpdateRate,
                  whiteList: settings.trackPrefixWhitelist,
                  restart: false,
                  primarySource: settings.primarySource,
                  timestamp: new Date()
                };
                this.lasagne.publish(Channel.Control, controlMessage);
              }
            });
          }
        }
      ]
    });

    popup.present();
  }

  syncLogs() {
    this.logging.syncDatabaseToServer().then(result => this.syncFail = !result);
  }
}
