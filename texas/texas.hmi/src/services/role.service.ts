import { Injectable } from '@angular/core';
import {ConfigService} from './config';
import {isNullOrUndefined} from '../functions/Utils';

export enum Role {
  // Alerts
  sendAlert,
  actionAlertUpdate,
  deleteAlert,

  // Tasks
  addTask,
  assignTask,
  deleteTask,

  // Pages
  experimentalControl,
  replayControl,

  // Control
  controlTrack
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  userRoles: string[] = [];

  /**
   * Constructor.
   *
   * @param config - handle to the config service.
   */
  constructor(config: ConfigService) {

    config.settingsChanged$.subscribe(settings => {
      if (isNullOrUndefined(settings)) {
        this.userRoles = [];
      } else {
        this.userRoles = settings.roles;
      }
    });
  }

  /**
   * Return true if the user has one of the given roles.
   *
   * @param roles - the list of roles.
   */
  hasRoles(roles: string[]) {
    if (isNullOrUndefined(this.userRoles)) {
      return false;
    } else {
      return this.userRoles.reduce((found, role) => roles.includes(role) || found, false);
    }
  }

  /**
   * Return true if the user has the given role.
   *
   * @param role - the role
   */
  hasRole(role: string) {
   return this.hasRoles([role]);
  }
}
