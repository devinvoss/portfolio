import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { GenreCount, Movie, MovieSearch } from '@portfolio/models';
import { Auth } from '../auth/auth.decorator';
import { MovieDto, UpdateMovieDto } from './movie.dto';
import { MovieService } from './movie.service';

@Controller('movie')
export class MovieController {

  constructor(private movieService: MovieService) {}

  // Declared before ':id' so "genres" isn't treated as a movie id
  @Get('genres')
  async getGenreCounts(): Promise<GenreCount[]> {
    return this.movieService.getGenreCounts();
  }

  @Get(':id')
  async getMovie(@Param() params): Promise<Movie> {
    return this.movieService.findMovie(params.id);
  }

  @Auth('admin')
  @Post()
  async addMovie(@Body() movie: MovieDto): Promise<Movie> {
    return this.movieService.insertMovie(movie);
  }

  @Auth('admin')
  @Put()
  async updateMovie(@Body() movie: UpdateMovieDto): Promise<Movie> {
    return this.movieService.updateMovie(movie);
  }

  @Post('search')
  async searchTitles(@Body() movieSearch: MovieSearch): Promise<MovieSearch> {
    return this.movieService.searchMovies(movieSearch);
  }

}
