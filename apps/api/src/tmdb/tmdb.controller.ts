import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { TmdbMovieDetails, TmdbSearchResult } from '@portfolio/models';
import { Auth } from '../auth/auth.decorator';
import { TmdbService } from './tmdb.service';

// Admin-only, like adding movies, so the TMDB key's quota isn't open to the public
@Auth('admin')
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
