import * as mongoose from 'mongoose';
import { Role } from '@portfolio/models';

// The movie's details are copied from TMDB when it's first recommended. Later recommenders
// only add comments, so the first recommender is the one recorded here.
export interface RecommendationDoc {
  _id: mongoose.Types.ObjectId;
  tmdbId: number;
  title: string;
  year: number | null;
  genre: string[];
  synopsis: string;
  imageUrl: string;
  actors: string[];
  director: string;
  runtimeMinutes: number | null;
  mpaaRating: string;
  recommendedById: mongoose.Types.ObjectId;
  recommendedByRole: Role;
  createdDate: Date;
}

export const RecommendationSchema = new mongoose.Schema({
  tmdbId: { type: Number, required: true },
  title: { type: String, required: true },
  year: { type: Number, default: null },
  genre: { type: [String], default: [] },
  synopsis: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  actors: { type: [String], default: [] },
  director: { type: String, default: '' },
  runtimeMinutes: { type: Number, default: null },
  mpaaRating: { type: String, default: '' },
  recommendedById: { type: mongoose.Schema.Types.ObjectId, required: true },
  recommendedByRole: { type: String, enum: ['admin', 'member'], required: true },
  createdDate: { type: Date, required: true }
});

// One recommendation per movie; a second recommender's note joins the first one's.
RecommendationSchema.index({ tmdbId: 1 }, { unique: true });
RecommendationSchema.index({ createdDate: -1 });
