import * as mongoose from 'mongoose';

// The users collection holds the site admin only; public accounts live in the accounts collection.
export const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  displayName: String,
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
