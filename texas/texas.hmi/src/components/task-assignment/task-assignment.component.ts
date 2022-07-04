import {Component, Input} from '@angular/core';
import {TrackManagerService} from '../../services/track-manager';
import {TrackRecord} from '../../classes/TrackRecord';
import {TaskEventDataType} from '../../interfaces';
import {UpdateContextualAlert} from '../../actions/contextual-alert.actions';
import {ContextualAlert} from '../../interfaces';
import {Track} from '../../interfaces';
import {Task} from '../../interfaces';
import {Store} from '@ngxs/store';
import {Source} from "../../enums/source";

/**
 * Angular component for assigning assets to tasks.
 */
@Component({
  selector: 'app-task-assignment',
  templateUrl: './task-assignment.component.html',
  styleUrls: ['./task-assignment.component.scss'],
})
export class TaskAssignmentComponent {

  // The selected alert.
  @Input() selectedAlert: ContextualAlert;

  // The owntrack object.
  @Input() owntrack: Track;

  // The task to be assigned to.
  @Input() task: Task = null;

  sourceType = Source;

  /**
   * Constructor.
   * @param tracks - reference to the track manager service.
   * @param store - reference to the ngxs store.
   */
  constructor(public tracks: TrackManagerService,
              private store: Store) {
  }

  /**
   * Callback for when a track is selected from the view.
   *
   * @param track - the selected track.
   */
  selectTrack(track: TrackRecord) {

    if (this.selectedAlert !== null) {
      // Find the task
      const tasks = this.selectedAlert.listOfTasks;
      this.task = tasks.find(t => t.id === this.task.id);

      const trackId = track.getLatestTrack().deviceId;

      if ((this.task !== null && this.task !== undefined) && this.task.deviceId.includes(trackId)) {
        this.task.deviceId = this.task.deviceId.filter(id => trackId !== id);

        this.task.events.push({
          type: TaskEventDataType.Information,
          timestamp: new Date(),

          title: track.getLatestTrack().deviceName + ' unassigned by ' + this.owntrack.deviceName + '.',
          description: ''
        });

      } else if ((this.task !== null && this.task !== undefined) && !this.task.deviceId.includes(trackId)) {
        this.task.deviceId.push(trackId);

        this.task.events.push({
          type: TaskEventDataType.Information,
          timestamp: new Date(),
          title: track.getLatestTrack().deviceName + ' assigned by ' + this.owntrack.deviceName + '.',
          description: ''
        });

      }
    }

    // Update the alert with the new state.
    this.store.dispatch(new UpdateContextualAlert(this.selectedAlert, true));
  }

  /**
   * Toggles auto assign on/off.
   */
  updateAutoAssign() {
    const tasks = this.selectedAlert.listOfTasks;
    this.task = tasks.find(t => t.id === this.task.id);

    this.task.events.push({
      type: TaskEventDataType.Information,
      timestamp: new Date(),
      title: this.owntrack.deviceName + ' set auto assigned to  ' + (this.task.autoAssign === true ? 'on.' : 'off.'),
      description: ''
    });

    // Update the alert with the new state.
    this.store.dispatch(new UpdateContextualAlert(this.selectedAlert, true));
  }
}
