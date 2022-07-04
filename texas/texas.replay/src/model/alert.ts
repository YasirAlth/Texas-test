import { LatLon } from './lat-lon';
import { TexasDeviceMessage } from './message';
import { Source } from './source';

export interface Alert extends TexasDeviceMessage {
  timestamp: Date;
  message: string;
  position: LatLon; // The initial position that the alert was raised from
  active: boolean;
  source: Source;
}
