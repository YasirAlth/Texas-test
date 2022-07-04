import { Component, OnInit } from '@angular/core';
import { UpdateType } from 'src/enums/update-type';
import { UpdateState } from 'src/enums/update-state';

import { IncidentReport } from 'src/interfaces/incident-report';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {AddIncidentReport} from '../../../actions/incident-reports.actions';
import {Select, Store} from '@ngxs/store';
import {Guid} from 'guid-typescript';
import {ContextualAlertState} from '../../../states/contextual-alert.state';
import {Observable} from 'rxjs';
import {ContextualAlert} from '../../../interfaces';

@Component({
  selector: 'app-mission-data-control',
  templateUrl: './mission-data-control.page.html'
})
export class MissionDataControlPage implements OnInit {
  supportedUpdateTypes = UpdateType;
  supportedReporters: string[];
  supportedLocations: string[];
  inputFormGroup: FormGroup;

  // Selected mission data information
  selectedMissionData = {
    updateType: '',
    reporter: '',
    location: '',
    number: '',
    alertId: ''
  };

  @Select(ContextualAlertState.contextualAlerts) alerts$: Observable<ContextualAlert[]>;

  constructor(private router: Router,
              private store: Store) {
    // TODO-ticket80 & 82: Next two need to be updated (currently mock data) and not sure if these will become enums also
    this.supportedReporters = [
      'Respected Authority',
      'Local Fisherman',
      'Jet Ski',
      ];
    this.supportedLocations = [
      'Crash Site',
      'Rescue'
    ];
  }

  ngOnInit() {
    this.inputFormGroup = new FormGroup({
      updateTypeCtrl: new FormControl(''),
      reporterCtrl: new FormControl(''),
      locationCtrl: new FormControl(''),
      alertIdCtrl: new FormControl(''),
      numberCtrl: new FormControl(''),
    }, Validators.requiredTrue);
  }

   public sendMissionData() {

    this.store.dispatch(new AddIncidentReport({
      _id: Guid.create().toString(),
      alertId: this.selectedMissionData.alertId,
      location: this.selectedMissionData.location,
      newValue: Number(this.selectedMissionData.number),
      observer: this.selectedMissionData.reporter,
      state: UpdateState.Unactioned,
      updateType: UpdateType[this.selectedMissionData.updateType],
      timestamp: new Date()
    }, true));
  }
}

