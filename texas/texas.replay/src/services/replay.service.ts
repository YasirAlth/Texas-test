import { Injectable, Inject } from '@nestjs/common';
import { stripIndent } from 'common-tags';
import { Guid } from 'guid-typescript';
import * as _ from 'lodash';
import { interval } from 'rxjs';
import * as Stopwatch from 'statman-stopwatch';
import * as timeunit from 'timeunit';
import { Logger } from 'winston';

import { LogService } from './log.service';
import { MessageService } from './message.service';
import { Trial } from '../model/trial';
import { Session } from '../model/session';
import { MsgType, TexasDeviceMessage } from '../model/message';
import { Replay } from '../model/replay';

///////////////////////////////////////////////////////////////////////////////
// REPLAY SESSION
///////////////////////////////////////////////////////////////////////////////

class ReplaySession {
  static readonly SPEED_MIN = 0.25;  // Minimum speed
  static readonly SPEED_MAX = 10;    // Maximum speed
  static readonly SPEED_INC = 0.25;  // Speed increments

  private _currentTime: Date; // Current time
  private _speed = 1;       // Playback speed -- will round upto 1

  readonly logger: Logger; // Debug logger
  readonly id: Guid;       // GUID (session id)

  readonly name: string;   // Custom non-unique name
  readonly start: Date;    // Start time
  readonly end: Date;      // End time
  started: boolean;        // Playback started

  index = -1;         // Current position in the messages array
  messages: TexasDeviceMessage[] = [];

  restart = true;

  constructor(logger: Logger, id: Guid, name: string,
    start: string, end: string, speed: number = 1, started: boolean = false) {
    logger.silly(`${ReplaySession.name}::constructor(...)`);
    this.logger = logger;
    this.id = id;
    this.name = name;
    this.start = new Date(start);
    this.end = new Date(end);
    this.speed = speed;
    this.currentTime = this.start;
    this.started = started;
  }

  get currentTime(): Date {
    this.logger.silly(`${ReplaySession.name}::[get]currentTime`);
    return this._currentTime;
  }

  set currentTime(value: Date) {
    this.logger.silly(`${ReplaySession.name}::[set]currentTime`);
    if (value.getTime() >= this.start.getTime() &&
      value.getTime() <= this.end.getTime()) {
      this._currentTime = value;
    } else {
      this.logger.error(stripIndent(`Cannot change current time; ${value} is \
        not in the range ${this.start} to ${this.end}`));
    }
  }

  get speed(): number {
    this.logger.silly(`${ReplaySession.name}::[get]speed`);
    return this._speed;
  }

  set speed(value: number) {
    this.logger.silly(`${ReplaySession.name}::[set]speed`);
    if (value < ReplaySession.SPEED_MIN) {
      this._speed = ReplaySession.SPEED_MIN;
    } else if (value > ReplaySession.SPEED_MAX) {
      this._speed = ReplaySession.SPEED_MAX;
    } else {
      this._speed = value;
    }
  }

  setMessages(allMessages: TexasDeviceMessage[]) {
    if (0 >= this.messages.length) {
      allMessages.forEach((msg, i) => {
        const msgTime = msg.timestamp.getTime(); // millis
        const startTime = this.start.getTime(); // millis
        const endTime = this.end.getTime(); // millis
        if (msgTime >= startTime && msgTime <= endTime) {
          this.messages.push(msg);
          // TODO could use a for loop and break early...
        }
      });
    }
  }
}

///////////////////////////////////////////////////////////////////////////////
// REPLAY SERVICE
///////////////////////////////////////////////////////////////////////////////

@Injectable()
export class ReplayService {
  private readonly sessions = new Map<string, ReplaySession>();

  constructor(
    @Inject('winston') private readonly logger: Logger,
    private readonly msgService: MessageService,
    logService: LogService) {
    this.logger.silly(`${ReplayService.name}::constructor`);

    const sw = new Stopwatch(true);
    logService.getAllMessages()
      .then(messages => {
        sw.stop();
        const timeToLoadMessagesSecs = timeunit.milliseconds.toSeconds(sw.read());
        this.logger.info(`Loaded ${messages.length} messages in ${timeToLoadMessagesSecs} secs`);
        this.logger.info('Starting message loop...');

        // process messages at a specified interval
        const timeStart = Date.now();
        let timeElapsed = 0;
        const timeoutMs = 250; // milliseconds
        interval(timeoutMs).subscribe((time) => {
          const prevTimeElapsed = timeElapsed;
          timeElapsed = Date.now() - timeStart;
          const intervalElapsed = timeElapsed - prevTimeElapsed;
          logger.info('interval elapsed:' + intervalElapsed);
          this.sessions.forEach(session => {
            sw.reset();
            sw.start();
            // get logs for the last 250ms i.e. ReplaySessionSession.now + 250ms;
            if (session.started) {

              session.setMessages(messages);
              // calculate the send window bounds
              const sendWindowMinMs = session.currentTime.getTime();
              const sendWindowMaxMs = session.currentTime.getTime() + (intervalElapsed * session.speed);

              // update the session's current time
              // (always based on timeout; not on message time)
              session.currentTime = new Date(sendWindowMaxMs);
              this.logger.info('session current time:' + sendWindowMaxMs);
              // Update the session's restart property
              session.restart = false;
              
              // loop through and send any messages in the send window
              let getNext = true;
              let msgCount = 0;
              while (getNext) {
                const now = Date.now();
                const nextMsgIndex = session.index + 1;
                const nextMsg = messages[nextMsgIndex];
                const nextMsgTime = nextMsg.timestamp.getTime();

                if (sendWindowMinMs > nextMsgTime) {
                  // ignore messages before the send window
                  // i.e. ignore messages before the start time
                  // increment until we reach the first message to send
                  ++session.index;
                } else if (nextMsgTime < sendWindowMaxMs) {
                  // the next message is in the send window
                  // clone deep because the message is modified in the publish method.
                  // The messages in the list should be immutable
                  // since they are used by multiple sessions
                  const msgToSend = _.cloneDeep(nextMsg);
                  msgToSend.replaySessionId = session.id.toString();
                  this.msgService.publish(msgToSend);
                  ++session.index;
                  ++msgCount;
                } else {
                  // The next message is after the send window,
                  // break out of the while loop here...
                  getNext = false;
                }
              }
              sw.stop();
              this.logger.info(`Processed ${msgCount} messages in ${sw.read()}ms for ${session.id}`);
            }
          });
        });
      });
  }

  create(run: Trial): Session {
    this.logger.silly(`${ReplayService.name}::create(${run})`);
    const id = Guid.create();
    const session = new ReplaySession(
      this.logger, id, run.name, run.start, run.end);
    this.sessions.set(id.toString(), session);
    const info: Session = {
      id: session.id.toString(),
      start: session.start.toString(),
      end: session.end.toString()
    };
    return info;
  }

  getAllSessionInfo(): Session[] {
    const sessions: Session[] = [];
    for (const session of this.sessions.values()) {
      const info: Session = {
        id: session.id.toString(),
        start: session.start.toString(),
        end: session.end.toString()
      };
      sessions.push(info);
    }
    return sessions;
  }

  info(id: string): Session {
    this.logger.silly(`${ReplayService.name}::info(${id})`);
    const session = this.sessions.get(id);
    const sessionExists = session != null;
    if (sessionExists) {
      const info: Session = {
        id: session.id.toString(),
        start: session.start.toString(),
        end: session.end.toString()
      };
      return info;
    } else {
      throw Error(`Cannot get info, ${id} is not known`);
    }
  }

  // TODO REMOVE
  getTimeOffset(id: string) {
    this.logger.silly(`${ReplayService.name}::getTimeOffset(${id})`);
    const session = this.sessions.get(id);
    const sessionExists = session != null;
    if (sessionExists) {
      return 0;
    } else {
      throw Error(`Cannot get time offset, ${id} is not known`);
    }
  }

  play(id: string, time?: Date) {
    this.logger.silly(`${ReplayService.name}::play(${id}, ${time})`);
    const session = this.sessions.get(id);
    const sessionExists = session != null;
    if (sessionExists) {
      if (time) {
        session.currentTime = time;
        session.restart = true;

        // not ideal ... hmm
        // find the new index to start from
        if (session.messages.length > 0) {
          let index = -1;
          for (const msg of session.messages) {
            ++index;
            const msgTime = msg.timestamp.getTime();
            const sessionTime = session.currentTime.getTime();
            if (msgTime > sessionTime) {
              // we've found the message, update session index,
              // and break out of the for loop
              session.index = index;
              break;
            }
          }
        }
        // Tell the client/s to 'start' replay mode
        // TODO really just using this message at presnt to
        // indicate that the front-end needs cleaning up
        // before resuming replay - possibly at a new point in time
        const replayMsg: Replay = {
          start: true,
          timestamp: new Date(),
          msgType: MsgType.REPLAY
        };
        this.msgService.publish(replayMsg);
      }
      session.started = true;
      this.logger.info(`playing session ${id}`);
    } else {
      throw Error(`Cannot play, ${id} is not known`);
    }
  }

  pause(id: string) {
    this.logger.silly(`${ReplayService.name}::pause(${id})`);
    const session = this.sessions.get(id);
    const sessionExists = session != null;
    if (sessionExists) {
      session.started = false;
        // Tell the client/s to 'pause' replay mode
        // TODO really just using this message at present to
        // indicate that the front-end needs cleaning up
        // before resuming replay - possibly at a new point in time
        const replayMsg: Replay = {
          start: false,
          timestamp: new Date(),
          msgType: MsgType.REPLAY
        };
        this.msgService.publish(replayMsg);
      this.logger.info(`paused session ${id}`);
    } else {
      throw Error(`Cannot pause, ${id} is not known`);
    }
  }

  getSessionTime(id: string): Date {
    this.logger.silly(`${ReplayService.name}::getReplaySessionTime(${id})`);
    const session = this.sessions.get(id);
    const sessionExists = session != null;
    if (sessionExists) {
      return session.currentTime;
    } else {
      throw Error(`Cannot get ReplaySession time, ${id} is not known`);
    }
  }

  setSpeed(id: string, speed: number) {
    this.logger.silly(`${ReplayService.name}::setSpeed(${id}, ${speed})`);
    const session = this.sessions.get(id);
    const sessionExists = session != null;
    if (sessionExists) {
      session.speed = speed;
    }
  }
}
