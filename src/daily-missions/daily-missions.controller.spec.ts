import { Test, TestingModule } from '@nestjs/testing';
import { DailyMissionsController } from './daily-missions.controller';

describe('DailyMissionsController', () => {
  let controller: DailyMissionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyMissionsController],
    }).compile();

    controller = module.get<DailyMissionsController>(DailyMissionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
