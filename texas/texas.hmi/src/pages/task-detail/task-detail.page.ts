import {Component, OnDestroy, OnInit} from '@angular/core';
import {Select, Store} from '@ngxs/store';
import {AlertMenuSettingsService} from '../../services/alert-menu-settings';
import {ActivatedRoute, Router} from '@angular/router';
import {TrackManagerService} from '../../services/track-manager';
import {map} from 'rxjs/operators';
import {ContextualAlert} from '../../interfaces';
import {ContextualAlertState} from '../../states/contextual-alert.state';
import {Observable, Subscription} from 'rxjs';
import {OwnTrackService} from '../../services/own-track';
import {Track} from '../../interfaces';
import {Task} from '../../interfaces';
import {ContextualAlertService} from '../../services/contextual-alerts';
import {Location} from '@angular/common';

/**
 * Page/Component that displays the details of a specific task.
 */
@Component({
  selector: 'app-task-detail',
  templateUrl: './task-detail.page.html',
  styleUrls: ['./task-detail.page.scss'],
})
export class TaskDetailPage implements OnInit, OnDestroy {

  // IF true display the assignment component on the page..
  displayAssignment = true;

  // The selected alert.
  selectedAlert: ContextualAlert = null;

  // alerts observable.
  @Select(ContextualAlertState.contextualAlerts) alerts$: Observable<ContextualAlert[]>;

  // The task to display.
  task: Task = null;

  // The ID of the parent alert for this task.
  alertId = '';

  // The main option for this task.
  mainOption: any = null;

  // The secondary option for this task.
  secondaryOption: any = null;

  // The task ID.
  taskId = '';

  // List of subscriptions.
  subscriptions = new Subscription();

  // The track representing this device (provided by OwnTrackService)
  private owntrack: Track = null;

  /**
   * Constructor.
   * @param store - reference to the ngxs store.
   * @param alertMenuSettingsService - reference to the alert menu settings service.
   * @param activatedRoute - reference to the angular active route service.
   * @param tracks - reference to the track manager service.
   * @param own - reference to the owntrack service.
   * @param alertService - reference to the contextual alert service.
   * @param location - reference to the4  angular location service.
   * @param router - reference to the angular router service.
   */
  constructor(private store: Store,
              private alertMenuSettingsService: AlertMenuSettingsService,
              private activatedRoute: ActivatedRoute,
              public tracks: TrackManagerService,
              public own: OwnTrackService,
              public alertService: ContextualAlertService,
              public location: Location,
              private router: Router) {

    // Subscribe to owntrack updates.
    this.subscriptions.add(this.own.ownTrackChanged$.subscribe(track =>  {

      // Save the owntrack.
      this.owntrack = track;
    }));
  }

  ngOnInit() {

    // Get the routing parameters.
    this.alertId = this.activatedRoute.snapshot.paramMap.get('alertId');
    this.taskId = this.activatedRoute.snapshot.paramMap.get('taskId');
    this.displayAssignment = Boolean(JSON.parse(this.activatedRoute.snapshot.paramMap.get('displayAssignment')));

    // Attempt to find the task.
    this.subscriptions.add(this.alerts$.pipe(
      map(alerts => alerts.filter(alert => alert.id === this.alertId))
    ).subscribe(alerts => {
      let taskFound = true;

      if (alerts.length > 0) {
        this.selectedAlert = alerts[0];
        if (this.selectedAlert !== undefined) {
          this.alertMenuSettingsService.getSettings().then(alertData => {
            this.mainOption = alertData[this.selectedAlert.primaryInfo];
            this.secondaryOption = this.mainOption.subMenu[this.selectedAlert.secondaryInfo];
            const tasks = this.selectedAlert.listOfTasks;
            this.task = tasks.find(t => t.id === this.taskId);
            if (this.task === null || this.task === undefined) {
              taskFound = false;
            }
          });
        } else {
          taskFound = false;
        }
      } else {
        taskFound = false;
      }

      // Navigate to the tasks screen if the task can not be found.
      if (!taskFound && this.router.url.startsWith('/sa-container/task-detail/')) {
        this.router.navigate(['/sa-container/tasks']);
      }
    }));
  }

  ngOnDestroy() {
    // Unsubscribe from all observables.
    this.subscriptions.unsubscribe();
  }
}
