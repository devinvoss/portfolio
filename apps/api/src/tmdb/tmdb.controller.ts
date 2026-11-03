import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TmdbMovieDetails, TmdbSearchResult } from '@portfolio/models';
import { Auth } from '../auth/auth.decorator';
import { TmdbService } from './tmdb.service';

// Signed-in users only, so recommending works but the TMDB key's quota isn't open to the public.
// Rate limited too, since a search makes several TMDB requests.
@Auth()
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('tmdb')
export class TmdbController {

  constructor(private tmdbService: TmdbService) {}

  @Get('search')
  async search(@Query('query') query: string): Promise<TmdbSearchResult[]> {
    return this.tmdbService.searchMovies(query);
  }

  @Get('movie/:id')
  async getMovie(@Param('id', ParseIntPipe) id: number): Promise<TmdbMovieDetails> {
    return this.tmdbService.getMovieDetails(id);
  }

}
