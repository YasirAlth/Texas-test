import {Action, Selector, State, StateContext} from '@ngxs/store';
import {patch, updateItem} from '@ngxs/store/operators';
import {IncidentReport} from '../interfaces';
import {AddIncidentReport, DeleteIncidentReport, UpdateIncidentReport} from '../actions/incident-reports.actions';
import * as _ from 'lodash';
import {UpdateState} from '../enums/update-state';

/**
 * Incident report data model.
 */
export class IncidentReportStateModel {
  incidentReports: IncidentReport[];
}

/**
 * Define the state container
 */
@State<IncidentReportStateModel>({
  name: 'IncidentReports',
  defaults: {
    incidentReports: []
  }
})

/**
 * The actual state class.
 */
export class IncidentReportState {

  /**
   * A memoized selector to obtain the incident reports.
   */
  @Selector()
  static incidentReports(state: IncidentReportStateModel) {
    return state.incidentReports;
  }

  /**
   * A memoized selector to obtain the incident reports length.
   */
  @Selector()
  static incidentReportsLength(state: IncidentReportStateModel) {
    return state.incidentReports.length;
  }

  /**
   * A memoized selector to obtain the unactioned incident reports length.
   */
  @Selector()
  static unactionedIncidentReportsLength(state: IncidentReportStateModel) {
    return state.incidentReports.filter(incident => incident.state === UpdateState.Unactioned).length;
  }

  /**
   * Action for when a report is added to the state model.
   */
  @Action(AddIncidentReport)
  add({getState, patchState }: StateContext<IncidentReportStateModel>, { payload, propagate }: AddIncidentReport) {
    const state = getState();
    if (state.incidentReports.find(a => a._id === payload._id) === undefined) {
      patchState({
        incidentReports: [...state.incidentReports, payload]
      });
    }
  }

  /**
   * Action for when a report is updated within the state model.
   */
  @Action(UpdateIncidentReport)
  update({setState }: StateContext<IncidentReportStateModel>, { payload, propagate }: UpdateIncidentReport) {
    setState(
      patch({
        incidentReports: updateItem<IncidentReport>(report => report._id === payload._id, _.cloneDeep(payload))
      })
    );
  }

  /**
   * Action for when a report is removed from the state model.
   */
  @Action(DeleteIncidentReport)
  remove({getState, patchState }: StateContext<IncidentReportStateModel>, { payload, propagate }: DeleteIncidentReport) {
    patchState({
      incidentReports: getState().incidentReports.filter(a => a._id !== payload)
    });
  }
}
