import { Router } from "express";
import passport from "passport";
import { configurePassport, googleCallback, logout, me } from "../controllers/authController.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = Router();

configurePassport(passport);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    prompt: "select_account",
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
  }),
  googleCallback
);

router.get("/me", optionalAuth, me);
router.post("/logout", logout);

export default router;
