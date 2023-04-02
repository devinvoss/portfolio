import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { Movie, MovieSearch } from '@portfolio/models';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MovieService } from './movie.service';

@Controller('movie')
export class MovieController {

  constructor(private movieService: MovieService) {}

  @Get(':id')
  async getMovie(@Param() params): Promise<Movie> {
    return this.movieService.findMovie(params.id);
  }

  // @UseGuards(JwtAuthGuard)
  @Post()
  async addMovie(@Body() movie: Movie): Promise<Movie> {
    return this.movieService.insertMovie(movie);
  }

  // @UseGuards(JwtAuthGuard)
  @Put()
  async updateMovie(@Body() movie: Movie): Promise<Movie> {
    return this.movieService.updateMovie(movie);
  }

  @Post('search')
  async searchTitles(@Body() movieSearch: MovieSearch): Promise<MovieSearch> {
    return this.movieService.searchMovies(movieSearch);
  }

}
