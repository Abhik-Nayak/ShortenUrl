import { nanoid } from "nanoid";

const guestMiddleware = (req, res, next) => {
  if (req.user?.id) {
    return next();
  }

  let guestId = req.cookies?.guestId;
  if (!guestId) {
    guestId = `guest_${nanoid(12)}`;
    res.cookie("guestId", guestId, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
  }

  req.guestId = guestId;
  return next();
};

export default guestMiddleware;
