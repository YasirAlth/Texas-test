import { LatLon } from './lat-lon';
import { Source } from '../enums/source';

export interface Track {
  deviceId: string;
  deviceName: string;
  position: LatLon;
  posAccuracy?: number;
  course?: number;
  heading: number;
  battery: number;
  updateRate: number;
  whiteList: string;
  active: boolean;
  timestamp: Date;
  source: Source[];
  primarySource: Source;
  type: string;          // ASSET -> default, MAN -> manual, TRI -> triangulation, DEL -> deleted
  categoryId: number;    // This number maps to a value (see category-config.json)
  agencyId: number;      // This number maps to a value (see agency-config.json)
}
