import { Controller, Get, Inject } from '@nestjs/common';
import { Logger } from 'winston';

import { TrialsService } from '../../services/trials.service';

@Controller('trial')
export class TrialController {

  constructor(
    @Inject('winston') private readonly logger: Logger,
    private readonly trialsService: TrialsService) {
    this.logger.debug(`${TrialController.name}::constructor(...)`);
  }

  @Get()
  allTrials() {
    this.logger.debug(`${TrialController.name}::allTrials()`);
    return this.trialsService.trials;
  }
}
