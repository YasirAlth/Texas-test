import { Component, OnInit } from '@angular/core';
import {ModalController} from '@ionic/angular';

/**
 * Angular component for adding a new task.
 */
@Component({
  selector: 'app-add-new-task',
  templateUrl: './add-new-task.component.html',
  styleUrls: ['./add-new-task.component.scss'],
})
export class AddNewTaskComponent {

  // The note information.
  data = {
    title: '',
    description: ''
  };

  /**
   *  Constructor
   *
   * @param modalCtrl - the Ionic modal controller.
   */
  constructor(public modalCtrl: ModalController) { }
}
