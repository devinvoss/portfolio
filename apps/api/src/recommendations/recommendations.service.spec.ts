import { ConflictException, ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { SessionUser, TmdbMovieDetails } from '@portfolio/models';
import { Types } from 'mongoose';
import { CommentsService } from '../comments/comments.service';
import { MovieService } from '../movie/movie.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { RecommendationDoc } from './recommendation.schema';
import { RecommendationsService } from './recommendations.service';

// Stands in for a mongoose query: every chained call returns itself and exec() resolves the value.
const query = <T>(value: T) => {
  const q = { lean: () => q, exec: () => Promise.resolve(value) };
  return q;
};

const id = () => new Types.ObjectId();
const sam: SessionUser = { id: id().toHexString(), role: 'member', displayName: 'Sam' };
const alex: SessionUser = { id: id().toHexString(), role: 'member', displayName: 'Alex' };
const admin: SessionUser = { id: id().toHexString(), role: 'admin', displayName: 'Devin' };

const details: TmdbMovieDetails = {
  tmdbId: 949,
  title: 'Heat',
  year: 1995,
  genres: ['Crime', 'Drama', 'Science Fiction'],
  synopsis: 'A cop and a thief.',
  director: 'Michael Mann',
  actors: ['Al Pacino', 'Robert De Niro'],
  runtimeMinutes: 170,
  mpaaRating: 'R',
  posters: [
    { thumbnailUrl: 'https://image.tmdb.org/t/p/w342/a.jpg', fullUrl: 'https://image.tmdb.org/t/p/original/a.jpg' },
    { thumbnailUrl: 'https://image.tmdb.org/t/p/w342/b.jpg', fullUrl: 'https://image.tmdb.org/t/p/original/b.jpg' }
  ]
};

const makeRecommendation = (by: SessionUser): RecommendationDoc => ({
  _id: id(),
  tmdbId: details.tmdbId,
  title: details.title,
  year: details.year,
  genre: ['Crime', 'Drama'],
  synopsis: details.synopsis,
  imageUrl: details.posters[0].fullUrl,
  actors: details.actors,
  director: details.director,
  runtimeMinutes: details.runtimeMinutes,
  mpaaRating: details.mpaaRating,
  recommendedById: new Types.ObjectId(by.id),
  recommendedByRole: by.role,
  createdDate: new Date()
});

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  const recommendationModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn()
  };
  const tmdbService = { getMovieDetails: jest.fn() };
  const movieService = { findWatched: jest.fn(), insertMovie: jest.fn() };
  const commentsService = {
    createOn: jest.fn(),
    findPeople: jest.fn(),
    countVisible: jest.fn(),
    hasCommentsByOthers: jest.fn(),
    moveToMovie: jest.fn(),
    deleteAllOn: jest.fn()
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    tmdbService.getMovieDetails.mockResolvedValue(details);
    movieService.findWatched.mockResolvedValue(null);
    recommendationModel.findOne.mockReturnValue(query(null));
    recommendationModel.deleteOne.mockReturnValue(query({}));
    recommendationModel.create.mockImplementation(async doc => ({ toObject: () => ({ _id: id(), ...doc }) }));
    commentsService.findPeople.mockResolvedValue(new Map());
    commentsService.countVisible.mockResolvedValue(new Map());
    commentsService.hasCommentsByOthers.mockResolvedValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: getModelToken('Recommendation'), useValue: recommendationModel },
        { provide: TmdbService, useValue: tmdbService },
        { provide: MovieService, useValue: movieService },
        { provide: CommentsService, useValue: commentsService }
      ]
    }).compile();

    service = module.get(RecommendationsService);
  });

  describe('recommend', () => {
    it('saves the movie from TMDB and posts the note as a comment', async () => {
      const result = await service.recommend(sam, { tmdbId: 949, note: 'You have to see this' });

      expect(result.alreadyRecommended).toBe(false);
      expect(recommendationModel.create).toHaveBeenCalledWith(expect.objectContaining({
        tmdbId: 949,
        title: 'Heat',
        genre: ['Crime', 'Drama', 'Sci-Fi'],
        imageUrl: details.posters[0].fullUrl,
        recommendedByRole: 'member'
      }));
      expect(commentsService.createOn).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'recommendation', title: 'Heat' }),
        sam,
        { body: 'You have to see this' }
      );
    });

    it('keeps a chosen TMDB poster but ignores any other URL', async () => {
      await service.recommend(sam, { tmdbId: 949, imageUrl: details.posters[1].fullUrl });
      expect(recommendationModel.create).toHaveBeenLastCalledWith(expect.objectContaining({ imageUrl: details.posters[1].fullUrl }));

      await service.recommend(sam, { tmdbId: 949, imageUrl: 'https://example.com/evil.jpg' });
      expect(recommendationModel.create).toHaveBeenLastCalledWith(expect.objectContaining({ imageUrl: details.posters[0].fullUrl }));
    });

    it('adds the note to an existing recommendation of the same movie', async () => {
      const existing = makeRecommendation(sam);
      recommendationModel.findOne.mockReturnValue(query(existing));

      const result = await service.recommend(alex, { tmdbId: 949, note: 'Seconded' });

      expect(result.alreadyRecommended).toBe(true);
      expect(result.recommendation.id).toBe(existing._id.toHexString());
      expect(recommendationModel.create).not.toHaveBeenCalled();
      expect(commentsService.createOn).toHaveBeenCalledWith(expect.objectContaining({ id: existing._id }), alex, { body: 'Seconded' });
    });

    it('joins the other recommendation when two arrive at once', async () => {
      const existing = makeRecommendation(sam);
      recommendationModel.findOne.mockReturnValueOnce(query(null)).mockReturnValueOnce(query(existing));
      recommendationModel.create.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: 11000 }));

      const result = await service.recommend(alex, { tmdbId: 949 });

      expect(result.alreadyRecommended).toBe(true);
      expect(result.recommendation.id).toBe(existing._id.toHexString());
    });

    it('skips the comment when there is no note', async () => {
      await service.recommend(sam, { tmdbId: 949 });
      expect(commentsService.createOn).not.toHaveBeenCalled();
    });

    it('refuses a movie that was already watched, pointing at it', async () => {
      movieService.findWatched.mockResolvedValue({ id: 'watched-id' });

      await expect(service.recommend(sam, { tmdbId: 949, note: 'Hi' })).rejects.toMatchObject({
        constructor: ConflictException,
        response: { movieId: 'watched-id' }
      });
      expect(movieService.findWatched).toHaveBeenCalledWith(949, 'Heat', 1995);
      expect(recommendationModel.create).not.toHaveBeenCalled();
      expect(commentsService.createOn).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('lets the admin dismiss any recommendation, with its comments', async () => {
      const doc = makeRecommendation(sam);
      recommendationModel.findById.mockReturnValue(query(doc));
      commentsService.hasCommentsByOthers.mockResolvedValue(true);

      await service.remove(doc._id, admin);

      expect(recommendationModel.deleteOne).toHaveBeenCalledWith({ _id: doc._id });
      expect(commentsService.deleteAllOn).toHaveBeenCalledWith(doc._id);
    });

    it('lets the recommender withdraw it while nobody else has commented', async () => {
      const doc = makeRecommendation(sam);
      recommendationModel.findById.mockReturnValue(query(doc));

      await service.remove(doc._id, sam);

      expect(commentsService.hasCommentsByOthers).toHaveBeenCalledWith(doc._id, { id: doc.recommendedById, role: 'member' });
      expect(recommendationModel.deleteOne).toHaveBeenCalled();
    });

    it('stops the recommender once someone else has commented', async () => {
      const doc = makeRecommendation(sam);
      recommendationModel.findById.mockReturnValue(query(doc));
      commentsService.hasCommentsByOthers.mockResolvedValue(true);

      await expect(service.remove(doc._id, sam)).rejects.toBeInstanceOf(ForbiddenException);
      expect(recommendationModel.deleteOne).not.toHaveBeenCalled();
    });

    it('stops anyone else', async () => {
      const doc = makeRecommendation(sam);
      recommendationModel.findById.mockReturnValue(query(doc));

      await expect(service.remove(doc._id, alex)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('get', () => {
    it('tells the viewer whether they can remove it', async () => {
      const doc = makeRecommendation(sam);
      recommendationModel.findById.mockReturnValue(query(doc));

      expect((await service.get(doc._id, sam)).canRemove).toBe(true);
      expect((await service.get(doc._id, alex)).canRemove).toBe(false);
      expect((await service.get(doc._id, null)).canRemove).toBe(false);
      expect((await service.get(doc._id, admin)).canRemove).toBe(true);
    });
  });

  describe('convert', () => {
    it('adds the movie with its TMDB id, moves the comments over and deletes the recommendation', async () => {
      const doc = makeRecommendation(sam);
      const movieId = id();
      recommendationModel.findById.mockReturnValue(query(doc));
      movieService.insertMovie.mockResolvedValue({ id: movieId.toHexString(), title: 'Heat' });

      const movie = await service.convert(doc._id, { title: 'Heat', rating: 5, notes: 'Loved it' });

      expect(movie.id).toBe(movieId.toHexString());
      expect(movieService.insertMovie).toHaveBeenCalledWith({ title: 'Heat', rating: 5, notes: 'Loved it', tmdbId: 949 });
      expect(commentsService.moveToMovie).toHaveBeenCalledWith(doc._id, movieId, 'Heat');
      expect(recommendationModel.deleteOne).toHaveBeenCalledWith({ _id: doc._id });
    });
  });
});
