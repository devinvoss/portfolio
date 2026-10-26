import { BadGatewayException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { TmdbMovieDetails, TmdbPoster, TmdbSearchResult } from '@portfolio/models';
import { environment } from '../environments/environment';

const API_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p';
const MAX_POSTERS = 5;
const MAX_ACTORS = 15;
const MAX_SEARCH_RESULTS = 8;

/* Only the parts of TMDB's responses that get used */
interface SearchResponse {
  results: { id: number; title: string; release_date?: string; poster_path: string | null }[];
}

interface Credits {
  cast: { name: string; order: number }[];
  crew: { name: string; job: string }[];
}

interface DetailsResponse {
  id: number;
  title: string;
  release_date?: string;
  overview: string;
  runtime: number | null;
  poster_path: string | null;
  genres: { name: string }[];
  credits: Credits;
  release_dates: {
    results: { iso_3166_1: string; release_dates: { certification: string; type: number }[] }[];
  };
  images: {
    posters: { file_path: string }[];
  };
}

@Injectable()
export class TmdbService {

  async searchMovies(query: string): Promise<TmdbSearchResult[]> {
    const trimmed = query?.trim();
    if (!trimmed) {
      return [];
    }

    const response = await this.get<SearchResponse>('/search/movie', { query: trimmed, include_adult: 'false' });
    const movies = response.results.slice(0, MAX_SEARCH_RESULTS);
    // Search results don't include credits, so each director is looked up separately
    const directors = await Promise.all(movies.map(movie => this.getDirector(movie.id)));

    return movies.map((movie, i) => ({
      tmdbId: movie.id,
      title: movie.title,
      year: this.toYear(movie.release_date),
      director: directors[i],
      posterThumbnailUrl: movie.poster_path ? `${IMAGE_URL}/w92${movie.poster_path}` : null
    }));
  }

  async getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
    const movie = await this.get<DetailsResponse>(`/movie/${tmdbId}`, {
      append_to_response: 'credits,release_dates,images',
      // Posters with English or no text; without this, images only includes the default language
      include_image_language: 'en,null'
    });

    return {
      tmdbId: movie.id,
      title: movie.title,
      year: this.toYear(movie.release_date),
      genres: movie.genres.map(genre => genre.name),
      synopsis: movie.overview ?? '',
      director: this.toDirector(movie.credits),
      actors: [...movie.credits.cast].sort((a, b) => a.order - b.order).slice(0, MAX_ACTORS).map(member => member.name),
      runtimeMinutes: movie.runtime || null,
      mpaaRating: this.getUsCertification(movie),
      posters: this.getPosters(movie)
    };
  }

  // The movie's main poster first, then TMDB's highest-voted alternates
  private getPosters(movie: DetailsResponse): TmdbPoster[] {
    const paths = [movie.poster_path, ...movie.images.posters.map(poster => poster.file_path)].filter(Boolean);
    return [...new Set(paths)].slice(0, MAX_POSTERS).map(path => ({
      thumbnailUrl: `${IMAGE_URL}/w342${path}`,
      fullUrl: `${IMAGE_URL}/original${path}`
    }));
  }

  // Prefers the theatrical release's rating, falling back to any US release that has one
  private getUsCertification(movie: DetailsResponse): string {
    const usReleases = movie.release_dates.results.find(country => country.iso_3166_1 === 'US')?.release_dates ?? [];
    const rated = usReleases.filter(release => release.certification);
    const theatrical = rated.find(release => release.type === 3);
    return (theatrical ?? rated[0])?.certification ?? '';
  }

  // A missing director shouldn't sink the whole search, so failures come back blank
  private async getDirector(tmdbId: number): Promise<string> {
    try {
      return this.toDirector(await this.get<Credits>(`/movie/${tmdbId}/credits`, {}));
    } catch {
      return '';
    }
  }

  private toDirector(credits: Credits): string {
    return credits.crew.filter(member => member.job === 'Director').map(member => member.name).join(', ');
  }

  private toYear(releaseDate?: string): number | null {
    const year = parseInt(releaseDate?.slice(0, 4) ?? '', 10);
    return Number.isNaN(year) ? null : year;
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const key = environment.tmdbApiKey;
    if (!key) {
      throw new ServiceUnavailableException('TMDB lookup is not configured.');
    }

    // v4 read access tokens are JWTs and go in a header; v3 keys go in the query string
    const isReadAccessToken = key.startsWith('eyJ');
    const url = new URL(`${API_URL}${path}`);
    url.search = new URLSearchParams(isReadAccessToken ? params : { ...params, api_key: key }).toString();

    const response = await fetch(url, {
      headers: isReadAccessToken ? { Authorization: `Bearer ${key}` } : {}
    });

    if (response.status === 404) {
      throw new NotFoundException('Movie not found on TMDB.');
    }
    if (!response.ok) {
      throw new BadGatewayException('TMDB request failed.');
    }

    return response.json() as Promise<T>;
  }
}
