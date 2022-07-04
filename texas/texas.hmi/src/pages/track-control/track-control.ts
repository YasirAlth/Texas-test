import {Component, OnInit} from '@angular/core';
import {TrackManagerService} from '../../services/track-manager';
import {Track, TrackControl} from '../../interfaces';
import {Channel, LasagneService} from '../../services/lasagne';
import {ConfigService} from '../../services/config';
import {TrackRecord} from '../../classes/TrackRecord';
import {Source} from '../../enums/source';
import {AlertController} from '@ionic/angular';
import {ActivatedRoute} from '@angular/router';

/**
 * Generated class for the TrackControlPage page.
 *
 * See https://ionicframework.com/docs/components/#navigation for more info on
 * Ionic pages and navigation.
 */

@Component({
  selector: 'page-track-control',
  templateUrl: 'track-control.html',
})
export class TrackControlPage implements OnInit {

  min: number;
  max: number;

  deviceName = '';
  newDeviceName = '';
  whiteList = '';
  newWhiteList = '';
  categoryId: number;
  agencyId: number;
  track: Track = null;
  updateRate: number;
  autoMode: boolean;
  primarySource: string;

  sourceType = Source;

  constructor(private trackManagerService: TrackManagerService,
              public alertCtrl: AlertController,
              private lasagne: LasagneService,
              public config: ConfigService,
              private activatedRoute: ActivatedRoute) {

    this.min = this.config.settings.minimumTrackUpdateRate;
    this.max = this.config.settings.maximumTrackUpdateRate;
  }

  ngOnInit() {
    try {
      const deviceId = this.activatedRoute.snapshot.paramMap.get('deviceId');

      const track = this.trackManagerService.tracks.find((t: TrackRecord) => {
        return t.getLatestTrack().deviceId === deviceId;
      });

      this.track = track.getLatestTrack();
      this.deviceName = this.newDeviceName = this.track.deviceName;
      this.autoMode = this.track.updateRate === 0;
      this.updateRate = this.autoMode ? this.min : this.track.updateRate;
      this.whiteList = this.newWhiteList = this.track.whiteList || '';
      this.categoryId = this.track.categoryId;
      this.agencyId = this.track.agencyId;
      this.primarySource = Source[this.track.primarySource];

      console.log('latest TRACK = ' + JSON.stringify(this.track));
    } catch (e) {
      console.log('error finding track:' + e);
    }
  }

  async restartTexas() {
    const prompt = await this.alertCtrl.create({
      header: 'Restart TEXAS',
      message: 'Are you sure you wish to restart TEXAS for ' + this.deviceName + '?',
      buttons: [
        {
          text: 'No',
          handler: data => {
            console.log('Saved clicked');
          }
        },
        {
          text: 'Yes',
          handler: data => {

            const controlMessage: TrackControl = {
              deviceId: this.track.deviceId,
              deviceName: this.track.deviceName,
              categoryId: this.track.categoryId,
              agencyId: this.track.agencyId,
              updateRate: this.track.updateRate,
              whiteList: this.track.whiteList,
              restart: true,
              primarySource: this.track.primarySource,
              timestamp: new Date()
            };

            this.lasagne.publish(Channel.Control, controlMessage);
          }
        }
      ]
    });

    prompt.present();
  }

  updateTrackData() {
    // Apply new device name (if entered, otherwise placeholder is the current name)
    //  and this will be usd this in the control message.
    this.newDeviceName = this.newDeviceName || this.deviceName;
    this.deviceName = this.newDeviceName;
    this.whiteList = this.newWhiteList;

    const controlMessage: TrackControl = {
      deviceId: this.track.deviceId,
      deviceName: this.deviceName,
      categoryId: this.categoryId,
      agencyId: this.agencyId,
      updateRate: this.autoMode ? 0 : this.updateRate,
      whiteList: this.newWhiteList,
      restart: false,
      primarySource: Source[this.primarySource],
      timestamp: new Date()
    };

    this.lasagne.publish(Channel.Control, controlMessage);
  }
}
