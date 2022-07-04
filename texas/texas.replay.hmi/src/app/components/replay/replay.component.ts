import { Component, OnInit } from '@angular/core';
import { coerceNumberProperty } from '@angular/cdk/coercion';
import { NGXLogger } from 'ngx-logger';
import { interval } from 'rxjs';

import { ReplayService } from '../../services/replay.service';

const EMPTY_STRING = '';

@Component({
  selector: 'app-replay',
  templateUrl: './replay.component.html',
  styleUrls: ['./replay.component.scss']
})
export class ReplayComponent implements OnInit {
  private static readonly EMPTY_STRING = '';

  private _replayTime: Date = undefined;
  private _serverTime: Date = undefined;
  private _clientTime: Date = undefined;
  offsetTime: string = undefined;

  title = 'texas-replay-hmi';
  thumbLabel = true;

  _sliderValue = 0;

  get sliderValue(): number {
    return this._sliderValue;
  }

  set sliderValue(value: number) {
    const cue = new Date(value).toString();
    console.log(`play from ${cue}`);
    this.replayService.play(cue.toString())
      .subscribe(
        res => this.logger.info(`cue to ${cue}`),
        err => this.logger.error(`ERROR: Unable to cue: ${err}`)
      );
  }

  private _speed = 1;

  get speed(): number {
    this.logger.trace(`${ReplayComponent.name}::[get]speed`);
    return this._speed;
  }

  set speed(value) {
    this.logger.trace(`${ReplayComponent.name}::[set]speed`);
    this._speed = coerceNumberProperty(value);
    this.replayService.speed(value).subscribe(
      res => this.logger.info(`changed speed to: ${value}`),
      err => this.logger.error(`ERROR: Unable to change speed: ${err}`)
    );
  }

  get createDisplayFn() {
    return value => this.formatLabel(value);
  }

  constructor(private readonly logger: NGXLogger,
    private readonly replayService: ReplayService) {
    this.logger.trace(`${ReplayComponent.name}::constructor(...)`);
  }

  ngOnInit() {
    console.log('HELLO');
    this.logger.trace(`${ReplayComponent.name}::ngOnInit()`);
    // Request an updated time at an interval of 250ms
    interval(250).subscribe(() => {
      this.logger.info('Request time update');
      const replayTimeObservable = this.replayService.requestReplayTime();
      if (replayTimeObservable) {
        replayTimeObservable.subscribe(replayTime => { // TODO must be a better way in rxjs...
            this.logger.debug('Receieved time', replayTime);
            if (replayTime) {
              this._replayTime = new Date(replayTime); // Update trials selector
            }
            this._sliderValue = this._replayTime.getTime();
          });
      }
      const replayTimeOffsetObservable = this.replayService.requestReplayTimeOffset();
      if (replayTimeOffsetObservable) {
        replayTimeOffsetObservable.subscribe(offsetTime => {
            this.logger.debug('Received offset time', offsetTime);
            this.offsetTime = offsetTime;
          });
      }
      this.replayService.requestServerTime()
        .subscribe(serverTime => {
          this.logger.debug('Received server time', serverTime);
          this._serverTime = new Date(serverTime);
        });
      this._clientTime = new Date(Date.now());
    });
  }

  getElapsedTime(): number {
    const currentTime = this.getReplayCurrentTimeMs();
    const startTime = this.getReplayStartTimeMs();
    const elapsedTime = currentTime - startTime;
    return elapsedTime;
  }

  getReplayTime(): string {
    this.logger.trace(`${ReplayService.name}::getReplayTime()`);
    return this._replayTime ? this._replayTime.toString() : EMPTY_STRING;
  }

  getClientTime(): string {
    this.logger.trace(`${ReplayService.name}::getClientTime()`);
    return this._clientTime ? this._clientTime.toString() : EMPTY_STRING;
  }

  getReplayCurrentTime(): Date | String {
    this.logger.trace(`${ReplayComponent.name}::getReplayCurrentTime()`);
    return this._replayTime ? this._replayTime : ReplayComponent.EMPTY_STRING;
  }

  getReplayCurrentTimeMs(): number {
    this.logger.trace(`${ReplayComponent.name}::getReplayCurrentTimeMs()`);
    return this._replayTime ? this._replayTime.getTime() : 0;
  }

  getReplayTimeOffsetMs(): number {
    this.logger.trace(`${ReplayComponent.name}::getReplayTimeOffsetMs()`);
    return Number(this.offsetTime);
  }

  getReplayDuration(): number {
    this.logger.trace(`${ReplayComponent.name}::getReplayDuration()`);
    return this.getReplayEndTimeMs() - this.getReplayStartTimeMs();
  }

  getReplaySessionId(): string {
    this.logger.trace(`${ReplayComponent.name}::getReplaySessionId()`);
    const session = this.replayService.session;
    return session ? session.id : ReplayComponent.EMPTY_STRING;
  }

  getReplayEndTime(): Date | String {
    this.logger.trace(`${ReplayComponent.name}::getReplayEndTime()`);
    const session = this.replayService.session;
    return session ? new Date(session.end) : ReplayComponent.EMPTY_STRING;
  }

  getReplayEndTimeMs(): number {
    this.logger.trace(`${ReplayComponent.name}::getReplayEndTimeMs()`);
    const session = this.replayService.session;
    return session ? new Date(session.end).getTime() : 0;
  }

  getReplayStartTime(): Date | String {
    this.logger.trace(`${ReplayComponent.name}::getReplayStartTime()`);
    const session = this.replayService.session;
    return session ? new Date(session.start) : ReplayComponent.EMPTY_STRING;
  }

  getReplayStartTimeMs(): number {
    this.logger.trace(`${ReplayComponent.name}::getReplayStartTimeMs()`);
    const session = this.replayService.session;
    return session ? new Date(session.start).getTime() : 0;
  }

  getServerTime(): string {
    this.logger.trace(`${ReplayService.name}::getServerTime()`);
    return this._serverTime ? this._serverTime.toString() : EMPTY_STRING;
  }

  onPlay(): void {
    this.logger.trace(`${ReplayComponent.name}::onPlay()`);
    this.replayService.play(this._replayTime.toString())
      .subscribe(
        res => console.log(`replay starting`),
        err => console.log(`ERROR: Unable to start replay: ${err}`)
      );
  }

  onPause(): void {
    this.logger.trace(`${ReplayComponent.name}::onPause()`);
    this.replayService.pause()
      .subscribe(
        res => this.logger.info(`replay pausing`),
        err => this.logger.error(`ERROR: Unable to pause replay: ${err}`)
      );
  }

  formatLabel(value: number | null) {
    this.logger.trace(`${ReplayComponent.name}::formatLabel()`);
    return Math.round(this.getElapsedTime() / 1000);
  }
}
