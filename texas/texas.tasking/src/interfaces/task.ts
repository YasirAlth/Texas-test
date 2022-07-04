import { TaskEvent } from './Event';

export interface Task {
  id: string;
  alertId: string;
  deviceId: string[];
  complete: boolean;
  taskInformation?: any;
  events: TaskEvent[];
  autoAssign: boolean;
}
