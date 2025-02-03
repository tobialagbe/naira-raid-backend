import { Test, TestingModule } from '@nestjs/testing';
import { DailyMissionsService } from './daily-missions.service';

describe('DailyMissionsService', () => {
  let service: DailyMissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyMissionsService],
    }).compile();

    service = module.get<DailyMissionsService>(DailyMissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
