import { Component, OnInit } from '@angular/core';
import {ModalController} from '@ionic/angular';

/**
 * Angular component for adding a new task.
 */
@Component({
  selector: 'app-add-new-task',
  templateUrl: './add-alert-lat-lon.component.html',
  styleUrls: ['./add-alert-lat-lon.component.scss'],
})
export class AddAlertLatLonComponent {

  // The note information.
  data = {
    lat: '0.0000',
    lon: '0.0000'
  };

  /**
   *  Constructor
   *
   * @param modalCtrl - the Ionic modal controller.
   */
  constructor(public modalCtrl: ModalController) { }
}
