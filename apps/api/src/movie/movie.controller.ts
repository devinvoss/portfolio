import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { Movie, MovieSearch } from '@portfolio/models';
import { Auth } from '../auth/auth.decorator';
import { MovieDto, UpdateMovieDto } from './movie.dto';
import { MovieService } from './movie.service';

@Controller('movie')
export class MovieController {

  constructor(private movieService: MovieService) {}

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
