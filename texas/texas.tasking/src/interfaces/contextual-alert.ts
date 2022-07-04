import { LatLon } from './lat-lon';
import { Task } from './task';

export enum EventType {
  alertAdded,
  alertUpdated,
  alertDeleted,
}

export interface ContextualAlert {
  id: string;
  ownerDeviceId: string;
  position: LatLon; // The initial position that the alert was raised from
  listOfTasks: Task[]; // Tasks associated with Tasking
  message: string;
  primaryInfo: number;
  secondaryInfo: number;
  active: boolean; // Active?
  timestamp: Date; // Date
}
