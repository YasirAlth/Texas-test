import { Test, TestingModule } from '@nestjs/testing';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

import { AmqpService } from './amqp.service';

describe('AmqpService', () => {
  let service: AmqpService;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        // TODO Can we mock this?
        WinstonModule.forRoot({
          transports: [new winston.transports.Console()]
        } as winston.LoggerOptions)],
      providers: [AmqpService]
    }).compile();
    service = module.get<AmqpService>(AmqpService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
