import { Test, TestingModule } from '@nestjs/testing';
import { ReplayController } from './replay.controller';

describe('Replay Controller', () => {
  let module: TestingModule;
  beforeAll(async () => {
    module = await Test.createTestingModule({
      controllers: [ReplayController],
    }).compile();
  });
  it('should be defined', () => {
    const controller: ReplayController = module.get<ReplayController>(ReplayController);
    expect(controller).toBeDefined();
  });
});
