import { Test, TestingModule } from '@nestjs/testing';
import * as Amqp from 'amqp-ts';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { MessageService } from './message.service';
import { AmqpService } from './amqp.service';
import { LatLon } from '../model/lat-lon';
import { CodecService } from './codec.service';
import { Alert } from '../model/alert';
import { Control } from '../model/control';
import { Track } from '../model/track';
import { TexasMessage } from '../model/message';

/*
 * This file contains integration tests for the MessageService.
 * The RabbitMQ broker must be started before running these tests.
 */
describe('MessageService', () => {

  // The service/class under test
  let service: MessageService;
  let connection: AmqpService;
  let codec: CodecService;

  beforeAll(async () => {

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // TODO Can we mock this?
        WinstonModule.forRoot({
          transports: [new winston.transports.Console()]
        } as winston.LoggerOptions)],
      providers: [MessageService, AmqpService, CodecService]
    }).compile();

    service = module.get<MessageService>(MessageService);
    connection = module.get<AmqpService>(AmqpService);
    codec = module.get<CodecService>(CodecService);

  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  }); // end 'should be defined'

  it('should throw error when publishing an unknown message type', async () => {

    let thrown = false;

    const emptyObj = {
      msgType: -1
    } as TexasMessage; // TODO Why does this even compile?

    service.publish(emptyObj)
      .catch((error) => thrown = true);

    await new Promise(resolve => setTimeout(resolve, 2000));

    expect(thrown).toBeTruthy();

  }); // end 'should throw error when publishing an unknown message type'

  it('should publish a track message to the texas.tracks exchange', async () => {

    let receivedMsg;
    let receivedMsgCount = 0;
    let promiseError = false;
    // {"active":true,
    // "battery":78,
    // "categoryId":4,
    // "deviceId":"ce12160c65b0aa3301",
    // "deviceName":"EXP-PID2",
    // "heading":88.62720489501953,
    // "msgType":1,"position":{"lat":-34.73196,"lon":138.64637},
    // "primarySource":1,"source":[0],
    // "timestamp":"2018-11-22T03:32:20.506Z",
    // "type":"ASSET",
    // "updateRate":0,
    // "whiteList":"EXP,UA"}
    // message from FIDES log (arranged to match interface)
    const message = {
      // TexasMessage common fields
      deviceId: 'TRAV',
      deviceName: 'TRAV',
      msgType: 1,
      timestamp: new Date(), // original value from logs: '2018-10-06T03:59:28.037Z',
      // Track specific fields
      position: {
        lat: -35.1495003,
        lon: 138.4684355
      } as LatLon,
      heading: 311.1097717285156,
      battery: 66,
      updateRate: 0, // 0 => auto
      whiteList: 'EXP,SLS,OBS',
      active: true,
      source: [0, 1],
      primarySource: 1,
      categoryId: 9
    } as Track;

    const exchange = connection.declareExchange(
      'texas.tracks',
      'fanout',
      // mirrors texas.service options (in c++ code)
      {
        durable: true,
        internal: false,
        autoDelete: false
      } as Amqp.Exchange.DeclarationOptions);

    // const queue = connection.declareQueue(
    //   'texas.tracks',
    //   // mirrors texas.service options (in c++ code)
    //   {
    //     noAck: true,
    //     noLocal: false,
    //     exclusive: false
    //   } as Amqp.Queue.StartConsumerOptions);

    // queue.bind(exchange);

    // queue.activateConsumer((msg) => {
    //   receivedMsg = codec.decode(msg.content);
    //   ++receivedMsgCount;
    //   console.log(JSON.stringify(receivedMsg));
    // });

    service.publish(message).then()
      .catch((error) => {
        promiseError = true;
        console.log(`expecting error: ${JSON.stringify(promiseError)}`);
      }); // Must be a better way

    await new Promise(resolve => setTimeout(resolve, 5000));

    // expect(receivedMsgCount).toEqual(1);
    // expect(receivedMsg).toMatchObject(message);
    // expect(promiseError).toBeFalsy();

   // queue.delete();

  }); // end 'should publish a track message to the texas.tracks exchange'

  // it('should publish an alert message to the texas.alerts exchange', async () => {

  //   let receivedMsg;
  //   let receivedMsgCount = 0;
  //   let promiseError = false;

  //   // message from FIDES log (arranged to match interface)
  //   const message = {
  //     // TexasMessage common fields
  //     deviceId: 'ce071607a54fda3905',
  //     deviceName: 'SLS-LS2',
  //     msgType: 2,
  //     timestamp: new Date(), // original value from logs: '2018-10-06T04:06:10.582Z',
  //     // Alert specific fields
  //     active: true,
  //     message: 'ALERT!!',
  //     position: {
  //       lat: -35.1321633,
  //       lon: 138.4674699
  //     },
  //     source: 0
  //   } as Alert;

  //   const exchange = connection.declareExchange(
  //     'texas.alerts',
  //     'fanout',
  //     // mirrors texas.service options (in c++ code)
  //     {
  //       durable: true,
  //       internal: false,
  //       autoDelete: false
  //     } as Amqp.Exchange.DeclarationOptions);

  //   const queue = connection.declareQueue(
  //     'texas.alerts',
  //     // mirrors texas.service options (in c++ code)
  //     {
  //       noAck: true,
  //       noLocal: false,
  //       exclusive: false
  //     } as Amqp.Queue.StartConsumerOptions);

  //   queue.bind(exchange);

  //   queue.activateConsumer((msg) => {
  //     receivedMsg = codec.decode(msg.content);
  //     ++receivedMsgCount;
  //     console.log(JSON.stringify(receivedMsg));
  //   }, {

  //   } as Amqp.Queue.ActivateConsumerOptions);

  //   service.publish(message).then()
  //     .catch((error) => promiseError = true); // Must be a better way

  //   await new Promise(resolve => setTimeout(resolve, 2000));

  //   expect(receivedMsgCount).toEqual(1);
  //   expect(receivedMsg).toMatchObject(message);
  //   expect(promiseError).toBeFalsy();

  //   // queue.delete();

  // }); // end 'should publish an alert message to the texas.alerts exchange'

  // it('should publish a control message to the texas.control exchange', async () => {

  //   let receivedMsg;
  //   let receivedMsgCount = 0;
  //   let promiseError = false;

  //   const deviceIdentifier = 'H8AZCY00T950RCH';

  //   // message from FIDES log (arranged to match interface)
  //   const message = {
  //     // TexasMessage common fields
  //     deviceId: deviceIdentifier,
  //     deviceName: 'BlueASUS_Z017DA',
  //     msgType: 3,
  //     timestamp: new Date(), // original value from logs: '2018-10-05T06:08:47.607Z',
  //     categoryId: 0,
  //     primarySource: 1,
  //     restart: true,
  //     updateRate: 0,
  //     whiteList: 'SLS'
  //   } as Control;

  //   const exchange = connection.declareExchange(
  //     'texas.control',
  //     'topic',
  //     // mirrors texas.service options (in c++ code)
  //     {
  //       durable: true,
  //       internal: false,
  //       autoDelete: false
  //     } as Amqp.Exchange.DeclarationOptions);

  //   const queue = connection.declareQueue(
  //     deviceIdentifier,
  //     // mirrors texas.service options (in c++ code)
  //     {
  //       noAck: true,
  //       noLocal: false,
  //       exclusive: false
  //     } as Amqp.Queue.StartConsumerOptions);

  //   queue.bind(exchange);

  //   queue.activateConsumer((msg) => {
  //     receivedMsg = codec.decode(msg.content);
  //     ++receivedMsgCount;
  //     console.log(JSON.stringify(receivedMsg));
  //     msg.ack();
  //   });

  //   service.publish(message, deviceIdentifier).then()
  //     .catch((error) => promiseError = true); // Must be a better way

  //   await new Promise(resolve => setTimeout(resolve, 2000));

  //   expect(receivedMsgCount).toEqual(1);
  //   expect(receivedMsg).toMatchObject(message);
  //   expect(promiseError).toBeFalsy();

  //   queue.delete();

  // }); // end 'should publish a control message to the texas.control exchange'

});