import { ServiceUnavailableException } from '@nestjs/common';
import { environment } from '../environments/environment';
import { TmdbService } from './tmdb.service';

describe('TmdbService', () => {
  const service = new TmdbService();
  const fetchMock = jest.fn();

  const respondWith = (body: unknown) => fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(body) });

  beforeEach(() => {
    environment.tmdbApiKey = 'v3key';
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('should refuse to call TMDB without a key', async () => {
    environment.tmdbApiKey = '';
    await expect(service.searchMovies('Alien')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should send a v3 key as a query param and a read access token as a bearer header', async () => {
    respondWith({ results: [] });

    await service.searchMovies('Alien');
    expect((fetchMock.mock.calls[0][0] as URL).searchParams.get('api_key')).toBe('v3key');

    environment.tmdbApiKey = 'eyJtoken';
    await service.searchMovies('Alien');
    const [url, init] = fetchMock.mock.calls[1];
    expect((url as URL).searchParams.has('api_key')).toBe(false);
    expect(init.headers).toEqual({ Authorization: 'Bearer eyJtoken' });
  });

  it('should map search results with each director, leaving it blank when credits fail', async () => {
    fetchMock.mockImplementation((url: URL) => {
      const respond = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
      switch (url.pathname) {
        case '/3/search/movie':
          return respond({ results: [
            { id: 348, title: 'Alien', release_date: '1979-05-25', poster_path: '/alien.jpg' },
            { id: 1, title: 'Unreleased', release_date: '', poster_path: null }
          ] });
        case '/3/movie/348/credits':
          return respond({ cast: [], crew: [{ name: 'Ridley Scott', job: 'Director' }] });
        default:
          return Promise.resolve({ ok: false, status: 500 });
      }
    });

    await expect(service.searchMovies('Alien')).resolves.toEqual([
      { tmdbId: 348, title: 'Alien', year: 1979, director: 'Ridley Scott', posterThumbnailUrl: 'https://image.tmdb.org/t/p/w92/alien.jpg' },
      { tmdbId: 1, title: 'Unreleased', year: null, director: '', posterThumbnailUrl: null }
    ]);
  });

  it('should map movie details', async () => {
    respondWith({
      id: 348,
      title: 'Alien',
      release_date: '1979-05-25',
      overview: 'In space no one can hear you scream.',
      runtime: 117,
      poster_path: '/main.jpg',
      genres: [{ name: 'Horror' }, { name: 'Science Fiction' }],
      credits: {
        // 20 billed actors, listed out of billing order
        cast: Array.from({ length: 20 }, (_, i) => ({ name: `Actor ${19 - i}`, order: 19 - i })),
        crew: [{ name: 'Ridley Scott', job: 'Director' }, { name: 'Dan O\'Bannon', job: 'Screenplay' }]
      },
      release_dates: { results: [
        { iso_3166_1: 'GB', release_dates: [{ certification: '18', type: 3 }] },
        { iso_3166_1: 'US', release_dates: [{ certification: '', type: 1 }, { certification: 'R', type: 3 }] }
      ] },
      images: { posters: ['/main.jpg', '/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg', '/e.jpg'].map(file_path => ({ file_path })) }
    });

    const details = await service.getMovieDetails(348);

    expect(details).toEqual(expect.objectContaining({
      title: 'Alien',
      year: 1979,
      genres: ['Horror', 'Science Fiction'],
      director: 'Ridley Scott',
      actors: Array.from({ length: 15 }, (_, i) => `Actor ${i}`),
      runtimeMinutes: 117,
      mpaaRating: 'R'
    }));
    expect(details.posters.map(poster => poster.fullUrl)).toEqual(
      ['/main.jpg', '/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg'].map(path => `https://image.tmdb.org/t/p/original${path}`)
    );
  });
});
