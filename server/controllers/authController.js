import jwt from "jsonwebtoken";
import passportGoogle from "passport-google-oauth20";
import User from "../models/User.js";
import Url from "../models/Url.js";

const GoogleStrategy = passportGoogle.Strategy;

const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      isPro: user.isPro,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24 * 7,
};

export const configurePassport = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("Google account email is required"), null);
          }

          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            user = await User.create({
              name: profile.displayName || "Google User",
              email,
              googleId: profile.id,
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
};

export const googleCallback = async (req, res) => {
  try {
    const token = signToken(req.user);
    res.cookie("token", token, cookieOptions);

    const guestId = req.cookies?.guestId;
    if (guestId) {
      await Url.updateMany(
        { guestId },
        {
          $set: { userId: req.user._id },
          $unset: { guestId: "" },
        }
      );
      res.clearCookie("guestId");
    }

    return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Authentication failed", error: error.message });
  }
};

export const me = async (req, res) => {
  if (!req.user?.id) {
    return res.status(200).json({ user: null });
  }

  const user = await User.findById(req.user.id).select("name email isPro createdAt");
  if (!user) {
    return res.status(200).json({ user: null });
  }

  return res.status(200).json({ user });
};

export const logout = async (_req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res.status(200).json({ message: "Logged out" });
};
