import {TaskEvent} from './event';

/**
 * Interface for a task within a Contextual Alert.
 */
export interface Task {
  id: string;
  alertId: string;
  deviceId: string[];
  complete: boolean;
  taskInformation?: any;
  events: TaskEvent[];
  autoAssign: boolean;
}
