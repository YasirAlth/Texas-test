import { Component, OnInit } from '@angular/core';
import {Select, Store} from '@ngxs/store';
import {IncidentReportState} from '../../states/incident-report.state';
import {Observable} from 'rxjs';
import {ContextualAlert, IncidentReport} from '../../interfaces';
import {ContextualAlertState} from '../../states/contextual-alert.state';
import {MissionDataService} from '../../services/mission-data.service';
import {UpdateType} from '../../enums/update-type';
import {UpdateState} from '../../enums/update-state';

@Component({
  selector: 'Texas-incident-updates',
  templateUrl: './incident-updates.page.html',
  styleUrls: ['./incident-updates.page.scss'],
})
export class IncidentUpdatesPage implements OnInit {

  // all the incidents observerable.
  @Select(IncidentReportState.incidentReports) incidents$: Observable<IncidentReport[]>;

  @Select(IncidentReportState.incidentReportsLength) numIncidents$: Observable<number>;

  @Select(IncidentReportState.unactionedIncidentReportsLength) numUnactionedIncidents$: Observable<number>;

  @Select(ContextualAlertState.contextualAlerts) alerts$: Observable<ContextualAlert[]>;

  updateType = UpdateType;

  updateState = UpdateState;

  constructor(private missionDataService: MissionDataService) { }

  ngOnInit() {

  }

  acceptIncident(incidentReport: IncidentReport) {
    incidentReport.state = UpdateState.Accepted;
    this.missionDataService.updateIncidentInformation(incidentReport);
  }

  declineIncident(incidentReport: IncidentReport) {
    incidentReport.state = UpdateState.Declined;
    this.missionDataService.updateIncidentInformation(incidentReport);
  }
}
