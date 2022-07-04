import { Component, OnInit} from '@angular/core';
import { NavParams, ModalController } from '@ionic/angular';

@Component ({
  selector: 'time-modal-page',
  templateUrl: 'time-modal-page.html'
})
export class TimeModalPage implements OnInit {
  timeType: string;
  timestamp: Date;
  userInput: string;

  constructor(private modalController: ModalController,
              private navParams: NavParams) {
  }

  ngOnInit() {
    this.timeType = this.navParams.get('timeModalType');
    this.timestamp = this.navParams.get('currentTime');
  }

  async closeModal() {
    await this.modalController.dismiss(this.userInput);
  }
}
