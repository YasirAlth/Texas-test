import {IncidentReport} from '../interfaces';

/**
 * Action for when a incident report is added
 */
export class AddIncidentReport {
  static readonly type = '[IncidentReport] Add';

  /**
   * Constructor.
   *
   * @param payload - the report.
   * @param propagate - true if the add is to be propagated across the system.
   */
  constructor(public payload: IncidentReport, public propagate: boolean = true) {}
}

/**
 * Action for when a incident report is updated,
 */
export class UpdateIncidentReport {
  static readonly type = '[IncidentReport] Update';

  /**
   * Constructor.
   *
   * @param payload - the report.
   * @param propagate - true if the update is to be propagated across the system.
   */
  constructor(public payload: IncidentReport, public propagate: boolean = true) {}
}

/**
 * Action for when a incident report is deleted,
 */
export class DeleteIncidentReport {
  static readonly type = '[IncidentReport] Delete';

  /**
   * Constructor.
   *
   * @param payload - the report.
   * @param propagate - true if the delete is to be propagated across the system.
   */
  constructor(public payload: string, public propagate: boolean = true) {}
}
