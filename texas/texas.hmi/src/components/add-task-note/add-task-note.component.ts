import { Component, OnInit } from '@angular/core';
import {ModalController} from '@ionic/angular';

/**
 * Angular component for add a new note to a task.
 */
@Component({
  selector: 'app-add-task-note',
  templateUrl: './add-task-note.component.html',
  styleUrls: ['./add-task-note.component.scss'],
})
export class AddTaskNoteComponent {

  // The note information.
  data: string;

  /**
   *  Constructor
   *
   * @param modalCtrl - the Ionic modal controller.
   */
  constructor(public modalCtrl: ModalController) { }
}
