import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { Logger } from 'winston';
import { Trial } from '../../model/trial';
import { ReplayService } from '../../services/replay.service';
import { Session } from '../../model/session';

@Controller('replay')
export class ReplayController {

  constructor(
    @Inject('winston') private readonly logger: Logger,
    private readonly replayService: ReplayService) {
    this.logger.silly(`${ReplayController.name}::constructor(...)`);
  }

  @Post('create')
  create(@Body() run: Trial): Session {
    this.logger.debug(`${ReplayController.name}::create(${run})`);
    return this.replayService.create(run);
  }

  @Get('info')
  infoAll(): Session[] {
    this.logger.silly(`${ReplayController.name}::infoAll()`);
    return this.replayService.getAllSessionInfo();
  }

  @Get('info/:session')
  info(@Param('session') session: string): Session {
    this.logger.silly(`${ReplayController.name}::info(${session})`);
    return this.replayService.info(session);
  }

  @Get('pause/:session')
  pause(@Param('session') session: string): void {
    this.logger.silly(`${ReplayController.name}::stop()`);
    return this.replayService.pause(session);
  }

  @Get('play/:session/:time')
  play(@Param('session') session: string, @Param('time') time: string): void {
    this.logger.silly(`${ReplayController.name}::play(${session}, ${time})`);
    const timeAsDate = new Date(time);
    this.replayService.play(session, timeAsDate);
  }

  @Get('speed/:session/:value')
  speed(@Param('session') session: string, @Param('value') value: string): void {
    this.logger.silly(`${ReplayController.name}::speed(${session}, ${value})`);
    this.replayService.setSpeed(session, Number(value));
  }

  @Get('replay-time/:session')
  getReplayTime(@Param('session') session: string): Date {
    this.logger.silly(`${ReplayController.name}::getReplayTime(${session})`);
    return this.replayService.getSessionTime(session);
  }

  @Get('replay-time-offset/:session')
  getReplayTimeOffset(@Param('session') session: string): number {
    this.logger.silly(`${ReplayController.name}::getReplayTimeOffset(${session})`);
    return this.replayService.getTimeOffset(session);
  }

  @Get('server-time')
  getServerTime(): Date {
    this.logger.silly(`${ReplayController.name}::getServerTime()`);
    return new Date(Date.now());
  }
}
