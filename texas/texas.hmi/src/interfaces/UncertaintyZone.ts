import {LatLonSpherical} from 'geodesy';

export interface UncertaintyZone {
  zone: [number, number][];
  posAccuracy: number;
  deviceId: string;
  centre: LatLonSpherical;
}
