import {Component, OnDestroy, OnInit} from '@angular/core';
import {Observable, Subscription} from 'rxjs';
import {ContextualAlertState} from '../../states/contextual-alert.state';
import {Select, Store} from '@ngxs/store';
import {ContextualAlert} from '../../interfaces';
import {AlertMenuSettingsService} from '../../services/alert-menu-settings';
import {ContextualAlertService} from '../../services/contextual-alerts';

/**
 * Angular component to display a list of alerts.
 */
@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.page.html',
  styleUrls: ['./alerts.page.scss'],
})
export class AlertsPage implements OnInit, OnDestroy {

  // alerts observable.
  @Select(ContextualAlertState.contextualAlerts) alerts$: Observable<ContextualAlert[]>;

  // number of alerts observable.
  @Select(ContextualAlertState.contextualAlertsLength) numAlerts$: Observable<number>;

  // The alert menu information.
  alertMenuData: any = null;

  // List of subscriptions.
  subscriptions = new Subscription();

  /**
   *
   * @param store - reference to the ngxs store.
   * @param alertMenuSettingsService - reference to the alert menu settings service.
   * @param alertService - reference to the contextual alert service.
   */
  constructor(private store: Store,
              private alertMenuSettingsService: AlertMenuSettingsService,
              public alertService: ContextualAlertService) {

    // Subscribe to owntrack updates.
    this.alertMenuSettingsService.getSettings().then(alertsData => {
       this.alertMenuData = alertsData;
    });
  }

  /**
   * Angular framework call.
   */
  ngOnInit() {
    // this.subscriptions.add(this.alerts$.subscribe(alert => {
    //   // do something with alerts?
    // }));
  }

  /**
   * Returns the assets assigned to the given alert.
   * @param alert - the alert
   */
  getAssetsAssignedToAlert(alert: ContextualAlert): number {
    const reducer = (accumulator: number, currentValue: number) => accumulator + currentValue;
    return alert.listOfTasks.map(task => task.deviceId.length).reduce(reducer, 0);
  }

  /**
   * Returns the number of completed tasks for the given alert.
   * @param alert - the alert
   */
  getNumTasksCompleteStatus(alert: ContextualAlert): number {
    const reducer = (accumulator: number, currentValue: number) => accumulator + currentValue;
    return alert.listOfTasks.map(task => Number(task.complete)).reduce(reducer, 0);
  }

  ngOnDestroy() {
    // Unsubscribe fro mall observables.
    this.subscriptions.unsubscribe();
  }
}
