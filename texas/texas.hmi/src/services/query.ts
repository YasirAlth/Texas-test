import { Injectable } from '@angular/core';
import { LatLon } from '../interfaces';
import { HttpClient } from '@angular/common/http';
import { ErrorService } from './error';
import {ConfigService} from './config';
import {catchError, map} from 'rxjs/operators';
import {Observable, throwError} from 'rxjs';

export interface EtaResponse {
  bearing: number;
  distance: number;
  eta: number;
}

@Injectable()
export class QueryService {

  private static SERVER_PORT = '3131';

  constructor(private http: HttpClient, private errorService: ErrorService, private configService: ConfigService) {

  }

  public getEta(position: LatLon, destination: LatLon, categoryAbbrv?: string, speed?: number): Observable<EtaResponse> {

    const body = {
      source: {
        lat: position.lat,
        lon: position.lon
      },
      destination: {
        lat: destination.lat,
        lon: destination.lon
      },
      type: categoryAbbrv
    };

    return this.http.post(this.configService.settings.texasQueryServer + '/eta', body).pipe(
      map((res: any) => res),
        catchError(error => {
          this.errorService.log('ETA query failed');
          return throwError(error);
        }));
  }
}
