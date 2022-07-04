export enum TaskEventDataType {
  Information,
  Image,
  Video,
}

export interface TaskEventData {
  attachmentId: string;
}

export interface TaskEvent {
  type: TaskEventDataType;
  timestamp: Date;
  title: string;
  description: string;
  data?: TaskEventData;
}
