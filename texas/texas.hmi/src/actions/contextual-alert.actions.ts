import {ContextualAlert} from '../interfaces';

/**
 * Action for when a contextual alert is added
 */
export class AddContextualAlert {
  static readonly type = '[ContextualAlert] Add';

  /**
   * Constructor.
   *
   * @param payload - the alert.
   * @param propagate - true if the add is to be propagated across the system.
   */
  constructor(public payload: ContextualAlert, public propagate: boolean = true) {}
}

/**
 * Action for when a contextual alert is updated,
 */
export class UpdateContextualAlert {
  static readonly type = '[ContextualAlert] Update';

  /**
   * Constructor.
   *
   * @param payload - the alert.
   * @param propagate - true if the update is to be propagated across the system.
   */
  constructor(public payload: ContextualAlert, public propagate: boolean = true) {}
}

/**
 * Action for when a contextual alert is deleted,
 */
export class DeleteContextualAlert {
  static readonly type = '[ContextualAlert] Delete';

  /**
   * Constructor.
   *
   * @param payload - the alert.
   * @param propagate - true if the delete is to be propagated across the system.
   */
  constructor(public payload: ContextualAlert, public propagate: boolean = true) {}
}
