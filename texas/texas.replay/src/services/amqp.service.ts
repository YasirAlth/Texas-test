import { Injectable, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import * as Bluebird from 'bluebird';
import * as Amqp from 'amqp-ts';

import { ConfigService } from '../modules/config/services/config.service';

@Injectable()
export class AmqpService {
  public static readonly DEFAULT_RECONNECT_STRATEGY = {
    retries: 5,
    interval: 1500
  } as Amqp.Connection.ReconnectStrategy;

  private connection: Amqp.Connection;
  private connected = false;

  constructor(@Inject('winston') private readonly logger: Logger, config: ConfigService) {
    this.logger.debug(`${AmqpService.name}::constructor(...)`);

    let rabbitAddress = '';
    if(config.get('USE_ENVIRONMENT')) {
      rabbitAddress = "amqp://" + process.env['rabbitmq-username'] + ":" + process.env['rabbitmq-password'] + "@" + process.env.RELEASE_NAME + "-rabbitmq-ha." + process.env.NAMESPACE + ".svc.cluster.local";
    } else {
      rabbitAddress =  config.get('RABBITMQ_ADDRESS');
    }

    this.connection = new Amqp.Connection(
        rabbitAddress, {},
        AmqpService.DEFAULT_RECONNECT_STRATEGY);
  }

  onModuleInit() {
    this.logger.debug(`${AmqpService.name}::onModuleInit()`);

    // print connection state
    this.connection.initialized.then(
     resolved => this.logger.info('AMQP connection - succeeded'),
     rejected => {
       this.logger.error('AMQP connection - failed');
       process.exit(1);
     });
  }

  async onModuleDestroy() {
    this.logger.debug(`${AmqpService.name}::onModuleDestroy()`);

    await this.connection.close().then(
     resolved => {
      this.logger.info('AMQP connection closed');
      this.connected = false;
     },
     rejected => {
      this.logger.error('Unable to close AMQP connection', rejected);
     });
  }

  completeConfiguration(): Bluebird<any> {
    this.logger.debug(`${AmqpService.name}::completeConfiguration()`);
    return this.connection.completeConfiguration();
  }

  deleteConfiguration(): Bluebird<any> {
    this.logger.debug(`${AmqpService.name}::deleteConfiguration()`);
    return this.connection.deleteConfiguration();
  }

  declareExchange(name: string, type?: string,
                  options?: Amqp.Exchange.DeclarationOptions): Amqp.Exchange {
    this.logger.debug(`${AmqpService.name}::declareExchange(...)`);
    return this.connection.declareExchange(name, type, options);
  }

  declareQueue(name: string,
               options?: Amqp.Queue.DeclarationOptions): Amqp.Queue {
    this.logger.debug(`${AmqpService.name}::declareQueue(...)`);
    return this.connection.declareQueue(name, options);
  }

  declareTopology(topology: Amqp.Connection.Topology): Bluebird<any> {
    this.logger.debug(`${AmqpService.name}::declareTopology(...)`);
    return this.connection.declareTopology(topology);
  }

  initialised(): Bluebird<void> {
    this.logger.debug(`${AmqpService.name}::initialized()`);
    return this.connection.initialized;
  }
}
