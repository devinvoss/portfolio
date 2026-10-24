import * as mongoose from 'mongoose';

export interface Movie extends mongoose.Document {
  id: string;
  title: string;
  year: number;
  genre: string[];
  synopsis: string;
  notes: string;
  rating: number;
  imageUrl: string;
  actors: string[];
  director: string;
  runtimeMinutes: number;
  mpaaRating: string;
  createdDate: Date;
  updatedDate: Date;
}

export interface MovieSearch {
  criteria: MovieSearchCriteria;
  results: Movie[];
  // Movies per genre matching every filter except genre, so each count is what selecting that genre would add
  genreCounts?: GenreCount[];
}

export interface MovieSearchCriteria {
  searchFields: MovieSearchFields;
  sortFields?: MovieSortFields;
  page: number;
  pageSize: number;
  totalCount?: number;
}

export interface MovieSearchFields {
  title: string;
  person: string;
  genre: string[];
  rating: number[];
}

export interface MovieSortFields {
  title?: number;
  rating?: number;
  year?: number;
  runtimeMinutes?: number;
  createdDate?: number;
}
export interface GenreCount {
  genre: string;
  count: number;
}
