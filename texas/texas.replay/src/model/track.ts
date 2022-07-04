import { LatLon } from './lat-lon';
import { TexasDeviceMessage } from './message';
import { Source } from './source';

export interface Track extends TexasDeviceMessage {
  timestamp: Date;
  position: LatLon;
  heading: number;
  battery: number;
  updateRate: number;
  whiteList: string;
  active: boolean;
  source: Source[];
  primarySource: Source;
  type: string;          // ASSET -> default, MAN -> manual, TRI -> triangulation, DEL -> deleted
  categoryId: number;    // This number maps to a value (see category config)
}
