import * as mongoose from 'mongoose';

export const MovieSchema = new mongoose.Schema({
  title: String,
  year: Number,
  genre: [
    { type: String }
  ],
  synopsis: String,
  notes: String,
  rating: Number,
  imageUrl: String,
  actors: [
    { type: String }
  ],
  director: String,
  runtimeMinutes: Number,
  mpaaRating: String,
  createdDate: Date,
  updatedDate: Date
}, {
  toJSON: {
    virtuals: true
  },
  toObject: {
    virtuals: true
  }
});

MovieSchema.virtual('id').get(function() {
  return this._id.toHexString();
});