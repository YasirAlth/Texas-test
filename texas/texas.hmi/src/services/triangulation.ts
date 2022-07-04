import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {LatLonSpherical} from 'geodesy';
import * as _ from 'lodash';
import {LatLon} from '../interfaces';
import {TriangulationData} from '../pages/map/map';

export interface PointAndBearing {
  point: LatLonSpherical;
  bearing: number;
}

@Injectable()
export class TriangulationProvider {
  get enabled(): boolean {
    return this.enabled_;
  }

  constructor(public http: HttpClient) {
  }

  private enabled_ = false;

  intersections: LatLon[] = [];

  public switchEnabled() {
    this.enabled_ = !this.enabled_;
  }

  findCenter(data: LatLon[]): LatLon {
    let minX, maxX, minY, maxY;
    for (let i = 0; i < data.length; i++) {
      minX = (data[i].lat < minX || minX == null) ? data[i].lat : minX;
      maxX = (data[i].lat > maxX || maxX == null) ? data[i].lat : maxX;
      minY = (data[i].lon < minY || minY == null) ? data[i].lon : minY;
      maxY = (data[i].lon > maxY || maxY == null) ? data[i].lon : maxY;
    }
    return {lat: (minX + maxX) / 2, lon: (minY + maxY) / 2};
  }

  getCentre(triangulationLines: {  [key: string]: TriangulationData  }): LatLon {

    let retVal: LatLon = null;

    this.intersections = _.drop(this.intersections, this.intersections.length);

    if (Object.keys(triangulationLines).length > 1) {
      // ok, lets get the intersections
      Object.keys(triangulationLines).forEach((key1, index1) => {
        Object.keys(triangulationLines).forEach((key2, index2) => {
          if (index1 !== index2 && triangulationLines[key1].active && triangulationLines[key2].active) {

            const p1 = triangulationLines[key1];
            const p2 = triangulationLines[key2];

            const result = LatLonSpherical.intersection(p1.pointAndBearing.point, p1.pointAndBearing.bearing, p2.pointAndBearing.point, p2.pointAndBearing.bearing);

            if (result !== null && !isNaN(result.lat) && !isNaN(result.lon)) {
              const intersection = result;

              // Only add this intersection if it is within a reasonable distance (100,000??)
              if (intersection.distanceTo(p1.pointAndBearing.point) < 100000) {
                this.intersections.push(intersection);
              }
            }
          }
        });

        if (this.intersections.length > 0) {
          retVal = this.findCenter(this.intersections);
          // console.log('CENTER1 = ' + JSON.stringify(retVal));
        }
      });
    }
    return retVal;
  }
}
