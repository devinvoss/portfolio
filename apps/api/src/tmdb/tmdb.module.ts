import { Module } from '@nestjs/common';
import { TmdbController } from './tmdb.controller';
import { TmdbService } from './tmdb.service';

@Module({
  providers: [TmdbService],
  controllers: [TmdbController],
})
export class TmdbModule {}
