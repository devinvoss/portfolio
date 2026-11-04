// This site's genres. TMDB's genre names are mapped onto these when a movie is filled in from TMDB.
export const GENRES = [
  'Action',
  'Adventure',
  'Animation',
  'Biopic',
  'Comedy',
  'Crime',
  'Dark Comedy',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'Horror',
  'Historical',
  'Indie',
  'Musical',
  'Mystery',
  'Period',
  'Romance',
  'Rom-Com',
  'Sci-Fi',
  'Thriller',
  'TV Movie',
  'War',
  'Western'
];

// Maps TMDB's genre names onto this site's genres, renaming the few that differ
export function mapTmdbGenres(tmdbGenres: string[]): string[] {
  const renamed: Record<string, string> = {
    'Science Fiction': 'Sci-Fi',
    'History': 'Historical',
    'Music': 'Musical'
  };
  const genres = tmdbGenres.map(genre => renamed[genre] ?? genre);
  if (genres.includes('Romance') && genres.includes('Comedy')) {
    genres.push('Rom-Com');
  }
  return GENRES.filter(genre => genres.includes(genre));
}
