import {ExpLogDataEntry} from '../interfaces/exp-log-data';

/**
 * Action for when a logging entry is added
 */
export class AddLoggingEntry {
  static readonly type = '[ExperimentalControl] Add';

  /**
   * Constructor.
   *
   * @param payload - the new logging entry.
   * @param propagate - if true propagate the event.
   */
  constructor(public payload: ExpLogDataEntry, public propagate: boolean = true) {}
}

/**
 * Action for when a logging entry is removed
 */
export class RemoveLoggingEntry {
  static readonly type = '[ExperimentalControl] Remove';

  /**
   * Constructor.
   *
   * @param payload - the logging entry to remove.
   * @param propagate - if true propagate the event.
   */
  constructor(public payload: string, public propagate: boolean = true) {}
}

