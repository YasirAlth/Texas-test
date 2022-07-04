import { Test, TestingModule } from '@nestjs/testing';
import { CodecService } from './codec.service';

import { LatLon } from '../model/lat-lon';
import { Track } from '../model/track';

/*
 * This file contains unit tests for the CodecService.
 */
describe('CodecService', () => {

  let service: CodecService;   // The service/class under test

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CodecService]
    }).compile();
    service = module.get<CodecService>(CodecService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encode and decode a message', () => {

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

    // Ensure the buffer is not empty
    const encodedMsg = service.encode(message);
    expect(encodedMsg.length).toBeGreaterThan(0);

    // Ensure the encoded message is smaller than a stringified message
    const stringifiedMsg = JSON.stringify(message);
    expect(stringifiedMsg.length).toBeGreaterThan(encodedMsg.length);

    // Ensure that the encoded message can be decoded
    const decodedMsg: Track = service.decode(encodedMsg);
    // TODO should we allow the timestamp coming back as a string?
    decodedMsg.timestamp = new Date(decodedMsg.timestamp);
    expect(decodedMsg).toMatchObject(message);

  });

});
