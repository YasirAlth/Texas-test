import {Component, OnDestroy, OnInit} from '@angular/core';
import {Select, Store} from '@ngxs/store';
import {ContextualAlertState} from '../../states/contextual-alert.state';
import {Observable, Subscription} from 'rxjs';
import {OwnTrackService} from '../../services/own-track';
import {Track} from '../../interfaces';
import {IncidentReportState} from '../../states/incident-report.state';

/**
 * Situational Awareness container (dont love the name).
 * Basically a container component that holds the map and contextual alerts pages/components.
 */
@Component({
  selector: 'app-sa-container',
  templateUrl: './sa-container.page.html',
  styleUrls: ['./sa-container.page.scss'],
})
export class SaContainerPage implements OnDestroy {

  // Number of alerts observable.
  @Select(ContextualAlertState.contextualAlertsLength) numAlerts$: Observable<number>;

  @Select(IncidentReportState.unactionedIncidentReportsLength) numIncidents$: Observable<number>;

  // Number of tasks observable.
  numTasks$: Observable<number> = null;

  // List of subscriptions.
  subscriptions = new Subscription();

  // The track representing this device (provided by OwnTrackService)
  private owntrack: Track = null;

  /**
   * Constructor.
   * @param store - reference to the ngxs store.
   * @param own - reference to the owntrack service.
   */
  constructor(private store: Store,
              public own: OwnTrackService) {

    // Subscribe to owntrack updates.
    this.subscriptions.add(this.own.ownTrackChanged$.subscribe(track =>  {

      // Save the owntrack.
      this.owntrack = track;

      // Now we can subscribe to the number of tracks for this device.
      this.numTasks$ = this.store.select(ContextualAlertState.numTasksForDevice(this.owntrack.deviceId));
    }));
  }

  /**
   * Angular framework call.
   */
  ngOnDestroy() {
    // Unsubscribe fro mall observables.
    this.subscriptions.unsubscribe();
  }
}
