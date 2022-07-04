import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NGXLogger } from 'ngx-logger';
import { Observable } from 'rxjs';

import { Trial } from '../model/trial';
import { Session } from '../model/session';

import { environment } from '../../environments/environment';

const EMPTY_STRING = '';

// Proxy for the replay service
@Injectable()
export class ReplayService {
  private readonly baseUrl =  environment.baseUrl;

  public session: Session;

  constructor(private readonly logger: NGXLogger,
    private readonly http: HttpClient) {
    this.logger.trace(`${ReplayService.name}::constructor(...)`);
  }

  getSessions(): Observable<Session[]> {
    this.logger.trace(`${ReplayService.name}::getSessions()`);
    const url = encodeURI(`${this.baseUrl}/replay/info`);
    this.logger.trace(`GET: ${url}`);
    return this.http.get<Session[]>(url);
  }

  getTrials(): Observable<Trial[]> {
    this.logger.trace(`${ReplayService.name}::getTrials()`);
    return this.http.get<Trial[]>(`${this.baseUrl}/trial`);
  }

  create(run: Trial): Observable<string> {
    this.logger.trace(`${ReplayService.name}::create(${run})`);
    const url = encodeURI(`${this.baseUrl}/replay/create`);
    this.logger.trace(`POST: ${url}`);
    return this.http.post<string>(url, run);
  }

  info(): Observable<Session> {
    this.logger.trace(`${ReplayService.name}::info()`);
    if (this.session) {
      const url = encodeURI(`${this.baseUrl}/replay/info/${this.session.id}`);
      this.logger.trace(`GET: ${url}`);
      return this.http.get<Session>(url);
    }
  }

  play(time: string): Observable<void> {
    this.logger.trace(`${ReplayService.name}::play(${time})`);
    if (this.session) {
      const url = encodeURI(
        `${this.baseUrl}/replay/play/${this.session.id}/${time}`);
      this.logger.trace(`GET: ${url}`);
      return this.http.get<void>(url);
    }
  }

  pause(): Observable<void> {
    this.logger.trace(`${ReplayService.name}::pause()`);
    if (this.session) {
      const url = `${this.baseUrl}/replay/pause/${this.session.id}`;
      this.logger.trace(`GET: ${url}`);
      return this.http.get<void>(url);
    }
  }

  speed(value: number): Observable<void> {
    this.logger.trace(`${ReplayService.name}::speed(${value})`);
    if (this.session) {
      const url = `${this.baseUrl}/replay/speed/${this.session.id}/${value}`;
      this.logger.trace(`GET: ${url}`);
      return this.http.get<void>(url);
    }
  }

  // Get the time of the replay (i.e. the last message sent)
  requestReplayTime(): Observable<string> {
    this.logger.trace(`${ReplayService.name}::getReplayTime()`);
    if (this.session) {
      const url = encodeURI(
        `${this.baseUrl}/replay/replay-time/${this.session.id}`);
      this.logger.trace(`GET: ${url}`);
      return this.http.get<string>(url);
    }
  }

  // Get the time offset (i.e. real time elapsed - msg time elapsed)
  requestReplayTimeOffset(): Observable<string> {
    this.logger.trace(`${ReplayService.name}::getReplayTimeOffset()`);
    if (this.session) {
      const url = encodeURI(
        `${this.baseUrl}/replay/replay-time-offset/${this.session.id}`);
      this.logger.trace(`GET: ${url}`);
      return this.http.get<string>(url);
    }
  }

  // Get the actual time of the server
  requestServerTime(): Observable<string> {
    this.logger.trace(`${ReplayService.name}::getServerTime()`);
    const url = encodeURI(`${this.baseUrl}/replay/server-time`);
    this.logger.trace(`GET: {$url}`);
    return this.http.get<string>(url);
  }
}
