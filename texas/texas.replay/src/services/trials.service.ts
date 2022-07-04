import { Injectable, Inject } from '@nestjs/common';
import { Logger } from 'winston';

import { Trial } from '../model/trial';

@Injectable()
export class TrialsService {

  private _trials: Trial[] = [
    {
      experiment: 'FIDES',
      name: 'FIDES run #1',
      start: 'Sat Oct 06 2018 00:18:00 GMT+0000',
      end: 'Sat Oct 06 2018 01:15:00 GMT+0000'
    },
    {
      experiment: 'FIDES',
      name: 'FIDES run #2',
      start: 'Sat Oct 06 2018 03:56:00 GMT+0000',
      end: 'Sat Oct 06 2018 04:34:00 GMT+0000'
    },
    {
      experiment: 'FIDES',
      name: 'FIDES run #3',
      start: 'Sat Oct 06 2018 05:56:00 GMT+0000',
      end: 'Sat Oct 06 2018 06:20:00 GMT+0000'
  }];

  constructor(@Inject('winston') private readonly logger: Logger) {
    this.logger.debug(`${TrialsService.name}::constructor(...)`);
  }

  get trials(): Array<Trial> {
    this.logger.debug(`${TrialsService.name}::[get]trials`);
    return this._trials;
  }
}
