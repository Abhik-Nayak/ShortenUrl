import mongoose, { Document, Schema } from "mongoose";

export interface IUrl extends Document {
  originalUrl: string;
  shortCode: string;
  clicks: number;
}

const urlSchema = new Schema<IUrl>(
  {
    originalUrl: {
      type: String,
      required: true,
      trim: true
    },
    shortCode: {
      type: String,
      required: true,
      unique: true
    },
    clicks: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const Url = mongoose.model<IUrl>("Url", urlSchema);

export default Url;
