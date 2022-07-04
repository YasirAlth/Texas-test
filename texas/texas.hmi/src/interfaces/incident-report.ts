import { UpdateType } from 'src/enums/update-type';
import { UpdateState } from 'src/enums/update-state';

export interface IncidentReport {
  _id: string;
  alertId: string; // Not sure how this will be determined.
  updateType: UpdateType;
  observer: string;
  location: string;
  newValue: number;
  state: UpdateState;
  timestamp: Date;
  extraInformation?: any;  // Optional
}
