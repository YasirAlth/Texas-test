import {ExpLogDataEntry} from '../interfaces/exp-log-data';
import {Action, Selector, State, StateContext} from '@ngxs/store';
import {AddLoggingEntry, RemoveLoggingEntry} from '../actions/experimental-control.actions';


/**
 * Data model.
 */
export class ExperimentalLoggingStateModel {
  loggingEntries: ExpLogDataEntry[];
}

/**
 * Define the state container
 */
@State<ExperimentalLoggingStateModel>({
  name: 'experimentalLoggingEntries',
  defaults: {
    loggingEntries: []
  }
})

/**
 * The actual state class.
 */
export class ExperimentalLoggingState {

  /**
   * A memoized selector to obtain the logging entries.
   */
  @Selector()
  static loggingEntries(state: ExperimentalLoggingStateModel) {
    return state.loggingEntries;
  }

  /**
   * A memoized selector to obtain the logging entries length.
   */
  @Selector()
  static loggingEntriesLength(state: ExperimentalLoggingStateModel) {
    return state.loggingEntries.length;
  }

  /**
   * Action for when a logging event is added to the state model.
   */
  @Action(AddLoggingEntry)
  addLoggingEntry({getState, patchState }: StateContext<ExperimentalLoggingStateModel>, { payload, propagate }: AddLoggingEntry) {
    const state = getState();
    patchState({
        loggingEntries: [...state.loggingEntries, payload]
    });
  }

  /**
   * Action for when a logging event is removed to the state model.
   */
  @Action(RemoveLoggingEntry)
  removeLoggingEntry({getState, patchState }: StateContext<ExperimentalLoggingStateModel>, { payload, propagate }: RemoveLoggingEntry) {
    patchState({
      loggingEntries: getState().loggingEntries.filter(a => a._id !== payload)
    });
  }
}
