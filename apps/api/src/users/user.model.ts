import * as mongoose from 'mongoose';

export const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  isAdmin: Number
}, {
  toJSON: {
    virtuals: true
  },
  toObject: {
    virtuals: true
  }
});

UserSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
