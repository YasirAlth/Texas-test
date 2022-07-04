import { Component, OnInit, Input} from '@angular/core';
import { NavParams, ModalController, AlertController } from '@ionic/angular';

@Component ({
  selector: 'text-input-modal-page',
  templateUrl: 'text-input-modal-page.html'
})
export class TextInputModalPage implements OnInit {
  textType: string;
  timestamp: Date;
  userInput: string;

  constructor(private modalController: ModalController,
              private navParams: NavParams,
              private popupController: AlertController) {
  }

  ngOnInit() {
    this.textType = this.navParams.get('textInputModalType');
    this.timestamp = this.navParams.get('currentTime');
  }

  async closeModal() {
    await this.modalController.dismiss(this.userInput);
  }

  async saveModal() {
    if (this.userInput === null || this.userInput === undefined) {
      // prompt the user to enter value in field
      const popup = await this.popupController.create({
        header: 'Experimental Control',
        message: 'Enter details into Details field. Or click Cancel.',
        buttons: ['OK']
      });
      popup.present();
    } else {
      this.closeModal();
    }
  }
  // Navigating away from the modal should also be treated as a cancel command
  cancelModal() {
    this.userInput = null;
    this.closeModal();
  }

}
