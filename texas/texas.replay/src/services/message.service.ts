import { Injectable, Inject } from '@nestjs/common';
import * as Amqp from 'amqp-ts';
import * as Bluebird from 'bluebird';
import { Logger } from 'winston';

import { AmqpService } from './amqp.service';
import { CodecService } from './codec.service';
import { TexasMessage, MsgType } from '../model/message';

@Injectable()
export class MessageService {

  private readonly alertsExchange = this.connection.declareExchange(
    'texas.alerts',
    'fanout',
    {
      durable: true,
      internal: false,
      autoDelete: false
    });

  private readonly tracksExchange = this.connection.declareExchange(
    'texas.tracks',
    'fanout',
    {
      durable: true,
      internal: false,
      autoDelete: false
    });

  private readonly replayExchange = this.connection.declareExchange(
    'texas.replay',
    'fanout',
    {
      durable: true,
      internal: false,
      autoDelete: false
    });

  constructor(
    @Inject('winston') private readonly logger: Logger,
    private readonly connection: AmqpService,
    private readonly codec: CodecService) {
    this.logger.silly(`${MessageService.name}::constructor(...)`);
  }

  publish(texasMsg: TexasMessage, routingKey?: string): Bluebird<any> {
    this.logger.silly(`${MessageService.name}::publish(...)`);
    // Only send the message once configuraiton is complete
    return this.connection.completeConfiguration().then(() => {
      texasMsg.timestamp = new Date();
      // Create message to send using msgpack encoding
      const amqpMessage = new Amqp.Message(this.codec.encode(texasMsg));
      switch (texasMsg.msgType) {
        case MsgType.TRACK_UPDATE: {
          this.logger.info('publishing track update');
          this.tracksExchange.send(amqpMessage);
          return;
        }
        case MsgType.ALERT_UPDATE: {
          this.logger.info('publishing alert update');
          this.alertsExchange.send(amqpMessage);
          return;
        }
        case MsgType.REPLAY: {
          this.logger.info('publishing replay message');
          this.replayExchange.send(amqpMessage);
          return;
        }
        default: {
          // Message types such as control are not supported in replay
          throw new Error('unsupported message type for replay');
        }
      }
    });
  }
}
