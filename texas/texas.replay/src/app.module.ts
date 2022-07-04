import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReplayService } from './services/replay.service';
import { ReplayController } from './controllers/replay/replay.controller';
import { LogService } from './services/log.service';
import { MessageService } from './services/message.service';
import { AmqpService } from './services/amqp.service';
import { CodecService } from './services/codec.service';
import { ConfigModule } from './modules/config/config.module';
import { TrialsService } from './services/trials.service';
import { TrialController } from './controllers/trial/trial.controller';
import * as winston from 'winston';


@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [new winston.transports.Console()]
    }),
    ConfigModule,
  ],
  controllers: [AppController, ReplayController, TrialController],
  providers: [AppService, ReplayService, LogService, MessageService, AmqpService, CodecService, TrialsService]
})
export class AppModule {}
