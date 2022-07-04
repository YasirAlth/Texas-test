import {Source} from '../enums/source';

export interface TrackControl {
  deviceId: string;
  deviceName: string;
  categoryId: number;
  agencyId: number;
  updateRate: number;
  whiteList: string;
  restart: boolean;
  primarySource: Source;
  timestamp: Date;
}
