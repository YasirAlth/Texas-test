import {Component, OnDestroy} from '@angular/core';
import {ContextualAlertState} from '../../states/contextual-alert.state';
import {Observable, Subscription} from 'rxjs';
import {Task} from '../../interfaces';
import {Select, Store} from '@ngxs/store';
import {OwnTrackService} from '../../services/own-track';
import {Track} from '../../interfaces';
import {AlertMenuSettingsService} from '../../services/alert-menu-settings';
import {ContextualAlert} from '../../interfaces';
import {ContextualAlertService} from '../../services/contextual-alerts';
import {ConfigService} from "../../services/config";

/**
 * Angular component to display a list of tasks.
 */
@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
})
export class TasksPage implements OnDestroy {

  // Current number of tasks.
  numTasks$: Observable<number> = null;

  // List of subscriptions.
  subscriptions = new Subscription();

  // Observable for task assigned to this device.
  tasks$: Observable<Array<Task>> = null;

  // A map that stores tasks -> alert IDs.
  taskToAlertMap = new Map();

  // alerts observable.
  @Select(ContextualAlertState.contextualAlerts) alerts$: Observable<ContextualAlert[]>;

  /**
   * Constructor.
   * @param store - reference to the ngxs store.
   * @param alertMenuSettingsService - reference to the alert menu settings service.
   * @param alertService - reference to the contextual alert service.
   * @param config
   */
  constructor(private store: Store,
              private alertMenuSettingsService: AlertMenuSettingsService,
              public alertService: ContextualAlertService,
              private config: ConfigService) {

    this.config.configLoaded.then(() => {

      // Now we can request the tasks for this device...
      this.tasks$ = this.store.select(ContextualAlertState.tasksForDevice(this.config.settings.deviceId));

      // .. and the number of tasks.
      this.numTasks$ = this.store.select(ContextualAlertState.numTasksForDevice(this.config.settings.deviceId));

      // Subscribe to the alerts
      this.subscriptions.add(this.alerts$.subscribe((alerts: Array<ContextualAlert>) => {
        alerts.forEach(alert => {
          alert.listOfTasks.forEach(task => {
            this.alertMenuSettingsService.getSettings().then(alertData => {
              // Map the alert descriptions to the task Ids.
              this.taskToAlertMap.set(task.id, { alert, taskDetail: alertData[alert.primaryInfo].mainOpt + ' ' + alertData[alert.primaryInfo].subMenu[alert.secondaryInfo].secOpt});
            });
          });
        });
      }));
    });
  }

  /**
   * Angular framework call.
   */
  ngOnDestroy() {
    // Unsubscribe fro mall observables.
    this.subscriptions.unsubscribe();
  }
}
