import {Component, OnDestroy, OnInit} from '@angular/core';
import {Select, Store} from '@ngxs/store';
import {AlertMenuSettingsService} from '../../services/alert-menu-settings';
import {ActivatedRoute, Router} from '@angular/router';
import {ContextualAlertState} from '../../states/contextual-alert.state';
import {Observable, Subscription} from 'rxjs';
import {ContextualAlert} from '../../interfaces';
import {map} from 'rxjs/operators';
import {UpdateContextualAlert} from '../../actions/contextual-alert.actions';
import {ModalController} from '@ionic/angular';
import {ContextualAlertService} from '../../services/contextual-alerts';
import { Location } from '@angular/common';
import {TaskEventDataType} from '../../interfaces';
import {Guid} from 'guid-typescript';
import {OwnTrackService} from '../../services/own-track';
import {Track} from '../../interfaces';
import {AddNewTaskComponent} from '../../components/add-new-task/add-new-task.component';

@Component({
  selector: 'app-alert-detail',
  templateUrl: './alert-detail.page.html',
  styleUrls: ['./alert-detail.page.scss'],
})
export class AlertDetailPage implements OnInit, OnDestroy {

  // The selected alert.
  selectedAlert: ContextualAlert = null;

  // all the alerts observerable.
  @Select(ContextualAlertState.contextualAlerts) alerts$: Observable<ContextualAlert[]>;

  // The selected alert Id.
  alertId = '';

  // The selected main option.
  mainOption: any = null;

  // The selection secondary option.
  secondaryOption: any = null;

  // The owntrack.
  private owntrack: Track;

  subscriptions = new Subscription();

  /**
   * Constructor
   * @param store - reference to the ngxs store.
   * @param alertMenuSettingsService - reference to the alert menu service.
   * @param activatedRoute - reference to the angular active route service.
   * @param alertService - reference to the contextual alert service.
   * @param location - reference to the angular router location service.
   * @param modalController - reference to the ionic modal controller.
   * @param own - reference to the own track service.
   * @param router - reference to the angular router service.
   */
  constructor(private store: Store,
              private alertMenuSettingsService: AlertMenuSettingsService,
              private activatedRoute: ActivatedRoute,
              public alertService: ContextualAlertService,
              public location: Location,
              public modalController: ModalController,
              private own: OwnTrackService,
              private router: Router) {

    // Subscribe to owntrack updates.
    this.subscriptions.add(this.own.ownTrackChanged$.subscribe((owntrack) => {
      this.owntrack = owntrack;
    }));
  }

  /**
   * Angular on init hook.
   */
  ngOnInit() {
    // Get the alert ID router param.
    this.alertId = this.activatedRoute.snapshot.paramMap.get('alertId');

    // Find the alert amonst all the alerts.
    this.subscriptions.add(this.alerts$.pipe(
      map(alerts => alerts.filter(alert => alert.id === this.alertId))
    ).subscribe(alerts => {
      if (alerts.length > 0) {
        this.selectedAlert = alerts[0];
        if (this.selectedAlert !== undefined) {
          this.alertMenuSettingsService.getSettings().then(alertData => {
            this.mainOption = alertData[this.selectedAlert.primaryInfo];
            this.secondaryOption = this.mainOption.subMenu[this.selectedAlert.secondaryInfo];
          });
        }
      } else if (this.router.url.startsWith('/sa-container/alert-detail/')) {
        // Navigate to the alert screen if the task can not be found.
        this.router.navigate(['/sa-container/alerts']);
      }
    }));
  }

  /**
   * Presents a modal to add a new task to the alert.
   */
  async addTask() {
    const modal = await this.modalController.create({
      component: AddNewTaskComponent
    });

    // Show the modal
    await modal.present();
    const { data } = await modal.onWillDismiss();

    // Ok if we have data, then add the new task.
    if (data) {
      this.selectedAlert.listOfTasks.push({
        alertId: this.alertId,
        autoAssign: false,
        complete: false,
        deviceId: [],
        events: [{
          type: TaskEventDataType.Information,
          timestamp: new Date(),
          title: 'Created by ' + this.owntrack.deviceName + '.',
          description: ''
         }],
        id: Guid.create().toString(),
          taskInformation: {
            title: data.title,
            description: data.description
          }
      });

      // Dispatch the event to the store.
      this.store.dispatch(new UpdateContextualAlert(this.selectedAlert, true));
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
