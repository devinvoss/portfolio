import * as mongoose from 'mongoose';

export interface User extends mongoose.Document {
  id: string;
  username: string;
  password: string;
  isAdmin: number;
}