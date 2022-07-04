import { Component } from '@angular/core';
import { ReplayService, ReplaySession, ReplaySettings } from '../../services/replay';
import { ConfigService } from '../../services/config';
import {NavController} from '@ionic/angular';

@Component({
  selector: 'page-replay',
  templateUrl: 'replay.html'
})
export class ReplayPage {
  private sessions: ReplaySession[] = [];
  private settings: ReplaySettings;

  constructor(
    readonly replayService: ReplayService,
    public navCtrl: NavController,
    public configService: ConfigService
  ) {
  }

  change() {
    this.replayService.saveSettings();
  }
}
