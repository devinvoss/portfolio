import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  AlreadyWatchedError, CommentPage, GenreCount, mapTmdbGenres, Movie, MovieComment, MovieSearchFields, Recommendation,
  RecommendationSearch, RecommendResult, SessionUser
} from '@portfolio/models';
import { Model, PipelineStage, Types } from 'mongoose';
import { CreateCommentDto } from '../comments/comment.dto';
import { CommentsService, CommentSubject, personKey } from '../comments/comments.service';
import { MovieDto } from '../movie/movie.dto';
import { buildSearchFilter, MovieService } from '../movie/movie.service';
import { TmdbService } from '../tmdb/tmdb.service';
import { RecommendDto } from './recommendation.dto';
import { RecommendationDoc } from './recommendation.schema';

type Viewer = SessionUser | null;

const isRecommender = (doc: RecommendationDoc, user: SessionUser) => doc.recommendedByRole === user.role && doc.recommendedById.equals(user.id);
const toSubject = (doc: RecommendationDoc): CommentSubject => ({ id: doc._id, type: 'recommendation', title: doc.title });

@Injectable()
export class RecommendationsService {

  constructor(
    @InjectModel('Recommendation') private recommendationModel: Model<RecommendationDoc>,
    private tmdbService: TmdbService,
    private movieService: MovieService,
    private commentsService: CommentsService
  ) {}

  /**
   * Recommends a movie, filling in its details from TMDB. If it was already recommended, the note
   * is added to that recommendation instead, and if it was already watched nothing is saved.
   */
  async recommend(user: SessionUser, dto: RecommendDto): Promise<RecommendResult> {
    const details = await this.tmdbService.getMovieDetails(dto.tmdbId);

    const watched = await this.movieService.findWatched(details.tmdbId, details.title, details.year);
    if (watched) {
      const body: AlreadyWatchedError = { message: 'Devin has already watched this movie.', movieId: watched.id };
      throw new ConflictException(body);
    }

    let doc = await this.recommendationModel.findOne({ tmdbId: details.tmdbId }).lean<RecommendationDoc>().exec();
    let alreadyRecommended = !!doc;
    if (!doc) {
      const posters = details.posters.map(poster => poster.fullUrl);
      try {
        const created = await this.recommendationModel.create({
          tmdbId: details.tmdbId,
          title: details.title,
          year: details.year,
          genre: mapTmdbGenres(details.genres),
          synopsis: details.synopsis,
          imageUrl: dto.imageUrl && posters.includes(dto.imageUrl) ? dto.imageUrl : posters[0] ?? '',
          actors: details.actors,
          director: details.director,
          runtimeMinutes: details.runtimeMinutes,
          mpaaRating: details.mpaaRating,
          recommendedById: new Types.ObjectId(user.id),
          recommendedByRole: user.role,
          createdDate: new Date()
        });
        doc = created.toObject<RecommendationDoc>();
      } catch (err) {
        // Someone else recommended it at the same moment; join theirs.
        if ((err as { code?: number })?.code !== 11000) {
          throw err;
        }
        doc = await this.recommendationModel.findOne({ tmdbId: details.tmdbId }).lean<RecommendationDoc>().exec();
        alreadyRecommended = true;
        if (!doc) {
          throw err;
        }
      }
    }

    if (dto.note) {
      await this.commentsService.createOn(toSubject(doc), user, { body: dto.note });
    }

    return { recommendation: await this.toRecommendation(doc, user), alreadyRecommended };
  }

  async get(id: Types.ObjectId, viewer: Viewer): Promise<Recommendation> {
    return this.toRecommendation(await this.findDoc(id), viewer);
  }

  /** The recommendation for a TMDB movie, if there is one. */
  async findByTmdbId(tmdbId: number): Promise<Recommendation | null> {
    const doc = await this.recommendationModel.findOne({ tmdbId }).lean<RecommendationDoc>().exec();
    return doc ? (await this.toRecommendations([doc]))[0] : null;
  }

  async search(search: RecommendationSearch): Promise<RecommendationSearch> {
    const { criteria } = search;
    const filter = buildSearchFilter({ ...criteria.searchFields, rating: [] });
    const byComments = criteria.sortFields?.commentCount === -1;

    const pipeline: PipelineStage[] = [{ $match: filter }];
    if (byComments) {
      pipeline.push(
        { $lookup: {
          from: this.commentsService.collectionName,
          let: { id: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$movieId', '$$id'] }, deleted: false } }, { $count: 'count' }],
          as: 'comments'
        } },
        { $addFields: { commentCount: { $ifNull: [{ $arrayElemAt: ['$comments.count', 0] }, 0] } } },
        { $project: { comments: 0 } }
      );
    }
    pipeline.push(
      { $sort: byComments ? { commentCount: -1, createdDate: -1, _id: -1 } : { createdDate: -1, _id: -1 } },
      { $skip: criteria.page > 0 ? criteria.page * criteria.pageSize : 0 },
      { $limit: criteria.pageSize }
    );

    const [docs, totalCount, genreCounts] = await Promise.all([
      this.recommendationModel.aggregate<RecommendationDoc>(pipeline).exec(),
      this.recommendationModel.countDocuments(filter).exec(),
      this.getGenreCounts(criteria.searchFields)
    ]);

    return {
      criteria: { ...criteria, totalCount },
      results: await this.toRecommendations(docs),
      genreCounts
    };
  }

  // Same as the watched movies' genre counts: the genre filter is ignored so the counts don't collapse.
  async getGenreCounts(fields?: MovieSearchFields): Promise<GenreCount[]> {
    const filter = fields ? buildSearchFilter({ ...fields, genre: [], rating: [] }) : {};
    return this.recommendationModel.aggregate<GenreCount>([
      { $match: filter },
      { $unwind: '$genre' },
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $project: { _id: 0, genre: '$_id', count: 1 } }
    ]).exec();
  }

  listComments(id: Types.ObjectId, viewer: Viewer, before?: string): Promise<CommentPage> {
    return this.commentsService.list(id, viewer, before);
  }

  async addComment(id: Types.ObjectId, user: SessionUser, dto: CreateCommentDto): Promise<MovieComment> {
    return this.commentsService.createOn(toSubject(await this.findDoc(id)), user, dto);
  }

  /** The admin can dismiss any recommendation; the recommender can withdraw theirs until someone else comments. */
  async remove(id: Types.ObjectId, user: SessionUser): Promise<void> {
    const doc = await this.findDoc(id);
    if (!await this.canRemove(doc, user)) {
      throw new ForbiddenException(isRecommender(doc, user)
        ? 'Others have commented on this recommendation, so it can no longer be withdrawn.'
        : 'Only the admin or the recommender can remove a recommendation.');
    }
    await this.recommendationModel.deleteOne({ _id: doc._id }).exec();
    await this.commentsService.deleteAllOn(doc._id);
  }

  /** Adds the recommendation to the watched movies with the admin's rating and notes; its comments move with it. */
  async convert(id: Types.ObjectId, dto: MovieDto): Promise<Movie> {
    const doc = await this.findDoc(id);
    const movie = await this.movieService.insertMovie({ ...dto, tmdbId: doc.tmdbId });
    await this.commentsService.moveToMovie(doc._id, new Types.ObjectId(movie.id), movie.title);
    await this.recommendationModel.deleteOne({ _id: doc._id }).exec();
    return movie;
  }

  private async findDoc(id: Types.ObjectId): Promise<RecommendationDoc> {
    const doc = await this.recommendationModel.findById(id).lean<RecommendationDoc>().exec();
    if (!doc) {
      throw new NotFoundException('Recommendation not found.');
    }
    return doc;
  }

  private async canRemove(doc: RecommendationDoc, viewer: Viewer): Promise<boolean> {
    if (!viewer) {
      return false;
    }
    if (viewer.role === 'admin') {
      return true;
    }
    return isRecommender(doc, viewer) && !await this.commentsService.hasCommentsByOthers(doc._id, { id: doc.recommendedById, role: doc.recommendedByRole });
  }

  private async toRecommendation(doc: RecommendationDoc, viewer: Viewer): Promise<Recommendation> {
    const [[recommendation], canRemove] = await Promise.all([this.toRecommendations([doc]), this.canRemove(doc, viewer)]);
    return { ...recommendation, canRemove };
  }

  private async toRecommendations(docs: RecommendationDoc[]): Promise<Recommendation[]> {
    const [people, counts] = await Promise.all([
      this.commentsService.findPeople(docs.map(doc => ({ id: doc.recommendedById, role: doc.recommendedByRole }))),
      this.commentsService.countVisible(docs.map(doc => doc._id))
    ]);
    return docs.map(doc => ({
      id: doc._id.toHexString(),
      tmdbId: doc.tmdbId,
      title: doc.title,
      year: doc.year ?? null,
      genre: doc.genre ?? [],
      synopsis: doc.synopsis ?? '',
      imageUrl: doc.imageUrl ?? '',
      actors: doc.actors ?? [],
      director: doc.director ?? '',
      runtimeMinutes: doc.runtimeMinutes ?? null,
      mpaaRating: doc.mpaaRating ?? '',
      recommendedBy: people.get(personKey(doc.recommendedByRole, doc.recommendedById)) ?? null,
      commentCount: counts.get(doc._id.toHexString()) ?? 0,
      createdDate: doc.createdDate.toISOString()
    }));
  }
}
