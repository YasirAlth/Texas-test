/**
 * Type of task event data.
 */
export enum TaskEventDataType {
  Information,
  Image,
  Video
}

/**
 * Interface for task event extended data.
 */
export interface TaskEventData {
  attachmentId: string;
}

/**
 * Interface for a task event.
 */
export interface TaskEvent {
  type: TaskEventDataType;
  timestamp: Date;
  title: string;
  description: string;
  data?: TaskEventData;
}
