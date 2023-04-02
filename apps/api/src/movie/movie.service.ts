import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Movie, MovieSearch, MovieSearchFields, MovieSortFields } from '@portfolio/models';
import { FilterQuery, Model } from 'mongoose';
import ImageKit = require('imagekit');
import { environment } from '../environments/environment';

@Injectable()
export class MovieService {

  constructor(@InjectModel('Movie') private movieModel: Model<Movie>) {}

  async findMovie(id: string): Promise<Movie> {
    const movie = await this.movieModel.findById(id).exec();
    if (!movie) {
      throw new NotFoundException('Movie not found.');
    }
    return movie;
  }

  async insertMovie(movie: Movie): Promise<Movie> {
    movie.imageUrl = await this.uploadImageToImageKit(movie.imageUrl, movie.title.toLocaleLowerCase());
    const newMovie = new this.movieModel({...movie});
    newMovie.createdDate = newMovie.updatedDate = new Date();
    return await newMovie.save();
  }

  async updateMovie(movie: Movie): Promise<Movie> {
    const updatedMovie = await this.findMovie(movie.id);
    if (updatedMovie.imageUrl !== movie.imageUrl) {
      movie.imageUrl = await this.uploadImageToImageKit(movie.imageUrl, movie.title.toLocaleLowerCase());
    }

    Object.assign(updatedMovie, movie);
    updatedMovie.updatedDate = new Date();
    return await updatedMovie.save();
  }

  async searchMovies(search: MovieSearch): Promise<MovieSearch> {
    const filter = this.buildSearchFilter(search.criteria.searchFields);
    const query = this.movieModel.find(filter)
      .sort(this.buildSortFilter(search.criteria.sortFields))
      .skip(search.criteria.page > 0 ? (search.criteria.page * search.criteria.pageSize) : 0)
      .limit(search.criteria.pageSize);

    search.criteria.totalCount = await this.movieModel.countDocuments(filter).exec();

    if (search.criteria.totalCount === 0) {
      search.results = [];
      return search;
    }

    search.results = await query.exec();
    return search;
  }

  private buildSearchFilter(fields: MovieSearchFields) {
    let filter: FilterQuery<Movie> = {};
    if (!fields) {
      return filter;
    }

    if (fields.genre && fields.genre.length > 0) {
      filter = { ...filter, genre: { $in: fields.genre }};
    }

    if (fields.person) {
      const pattern = new RegExp(fields.person, 'i');
      filter = { ...filter, $or: [
        { director: { $regex: pattern } },
        { actors: { $elemMatch: { $regex: pattern } } }
      ]};
    }

    if (fields.title) {
      const pattern = new RegExp(fields.title, 'i');
      filter = { ...filter, title: { $regex: pattern }}
    }

    if (fields.rating && fields.rating.length > 0) {
      filter = { ...filter, rating: { $in: fields.rating }};
    }

    return filter;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildSortFilter(fields: MovieSortFields): any {
    let sort = { 'createdDate': -1 };
    if (!fields) {
      return sort;
    }

    let property: keyof typeof fields;

    for (property in fields) {
      sort = { ...sort, [property]: fields[property] === -1 ? -1 : 1 };
    }

    return sort;
  }

  private async uploadImageToImageKit(url: string, fileName: string): Promise<string> {
    const imageKit = new ImageKit({
      publicKey: environment.ik_publicKey,
      privateKey: environment.ik_privateKey,
      urlEndpoint: environment.ik_endpoint
    });

    const uploadedImage = await imageKit.upload({
      file: url,
      fileName: fileName,
      folder: '/devinvoss_dev'
    });

    if (uploadedImage.$ResponseMetadata.statusCode !== 200) {
      throw new InternalServerErrorException('Unable to upload the image to ImageKit');
    }

    return uploadedImage.url;
  }
}

