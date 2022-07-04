import { Test, TestingModule } from '@nestjs/testing';
import { TrialController } from './trial.controller';

describe('Trial Controller', () => {
  let module: TestingModule;
  beforeAll(async () => {
    module = await Test.createTestingModule({
      controllers: [TrialController],
    }).compile();
  });
  it('should be defined', () => {
    const controller: TrialController = module.get<TrialController>(TrialController);
    expect(controller).toBeDefined();
  });
});
