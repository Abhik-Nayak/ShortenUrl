import mongoose from "mongoose";

const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: true,
      trim: true,
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    customAlias: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    guestId: {
      type: String,
      index: true,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    qrCode: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const Url = mongoose.model("Url", urlSchema);

export default Url;
