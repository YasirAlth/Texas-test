/**
 * Created by mathe on 17/07/2017.
 */
import {LatLon} from '../lat-lon';

export interface SetTrackInfo {
  deviceId: string;
  latLon: LatLon;
  heading: number;
}
