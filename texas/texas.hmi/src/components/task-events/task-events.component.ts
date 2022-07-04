import {Component, Input} from '@angular/core';
import {Task} from '../../interfaces';
import {TaskEventDataType} from '../../interfaces';

/**
 * Angular component to display a lis of task events.
 */
@Component({
  selector: 'app-task-events',
  templateUrl: './task-events.component.html',
  styleUrls: ['./task-events.component.scss'],
})
export class TaskEventsComponent  {

  // The task who's events should be shown.
  @Input() task: Task = null;

  // Enum type for the Task Event which can be used in the template.
  eventType = TaskEventDataType;

  /**
   * Constructor
   */
  constructor() { }
}
