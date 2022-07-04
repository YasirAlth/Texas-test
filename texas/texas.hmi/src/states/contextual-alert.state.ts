import {State, Action, StateContext, Selector, createSelector} from '@ngxs/store';
import {patch, updateItem} from '@ngxs/store/operators';
import {ContextualAlert} from '../interfaces';
import {
  AddContextualAlert,
  UpdateContextualAlert,
  DeleteContextualAlert
} from '../actions/contextual-alert.actions';
import {Task} from '../interfaces';
import * as _ from 'lodash';

/**
 * Contextual Alert data model.
 */
export class ContextualAlertStateModel {
  contextualAlerts: ContextualAlert[];
}

/**
 * Define the state container
 */
@State<ContextualAlertStateModel>({
  name: 'contextualAlerts',
  defaults: {
    contextualAlerts: []
  }
})

/**
 * The actual state class.
 */
export class ContextualAlertState {

  /**
   * A memoized selector to obtain the contextual alerts.
   */
  @Selector()
  static contextualAlerts(state: ContextualAlertStateModel) {
    return state.contextualAlerts;
  }

  /**
   * A memoized selector to obtain the contextual alerts length.
   */
  @Selector()
  static contextualAlertsLength(state: ContextualAlertStateModel) {
    return state.contextualAlerts.length;
  }

  /**
   * Returns the tasks for the given devices.
   * @param device - the requested Device by ID.
   * @param state - contextual alert state.
   */
  private static getTasksForDevice(device: string, state: ContextualAlertStateModel ) {
    const tasks = new Array<Task>();
    state.contextualAlerts.forEach(alert => {
      alert.listOfTasks.filter(task => task.deviceId.includes(device))
        .forEach(task => {
          tasks.push(task);
        });
    });
    return tasks;
  }

  /**
   * Dynamic selector to return the tasks for a given device.
   * @param device - the requested Device by ID.
   */
  static tasksForDevice(device: string) {
    return createSelector([ContextualAlertState], (state: ContextualAlertStateModel) => {
      return ContextualAlertState.getTasksForDevice(device, state);
    });
  }

  /**
   * Dynamic selector to return the number of  tasks for a given device.
   * @param device - the requested Device by ID.
   */
  static numTasksForDevice(device: string) {
    return createSelector([ContextualAlertState], (state: ContextualAlertStateModel) => {
      return ContextualAlertState.getTasksForDevice(device, state).length;
    });
  }

  /**
   * Action for when a alert is added to the state model.
   */
  @Action(AddContextualAlert)
  add({getState, patchState }: StateContext<ContextualAlertStateModel>, { payload, propagate }: AddContextualAlert) {
    const state = getState();
    if (state.contextualAlerts.find(a => a.id === payload.id) === undefined) {
      patchState({
        contextualAlerts: [...state.contextualAlerts, payload]
      });
    }
  }

  /**
   * Action for when a alert is updated within the state model.
   */
  @Action(UpdateContextualAlert)
  update({setState }: StateContext<ContextualAlertStateModel>, { payload, propagate }: UpdateContextualAlert) {
    setState(
      patch({
        contextualAlerts: updateItem<ContextualAlert>(alert => alert.id === payload.id, _.cloneDeep(payload))
      })
    );
  }

  /**
   * Action for when a alert is removed from the state model.
   */
  @Action(DeleteContextualAlert)
  remove({getState, patchState }: StateContext<ContextualAlertStateModel>, { payload, propagate }: DeleteContextualAlert) {
    patchState({
      contextualAlerts: getState().contextualAlerts.filter(a => a.id !== payload.id)
    });
  }
}
