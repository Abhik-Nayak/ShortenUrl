import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      unique: true,
      index: true,
    },
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isPro: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const User = mongoose.model("User", userSchema);

export default User;
