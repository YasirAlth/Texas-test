import {Task} from './task';
import {LatLon} from './lat-lon';

/**
 * The available contextual alert event types.
 */
export enum EventType {
  alertAdded,
  alertUpdated,
  alertDeleted
}

export interface IncidentInformation {
  rescuedPersonCount?: number;
  expectedMissionPersonCount?: number;
  identifiedPersonCount?: number;
  rescueLocation?: any;
}

/**
 * Interface for the Contextual Alert.
 */
export interface ContextualAlert {
  id: string;
  ownerDeviceId: string;
  position: LatLon;             // The initial position that the alert was raised from
  listOfTasks: Array<Task>;     // Tasks associated with Tasking
  message: string;
  primaryInfo: number;
  secondaryInfo: number;
  active: boolean;              // Active?
  timestamp: Date;              // Date
  incidentReport?: IncidentInformation;
}
