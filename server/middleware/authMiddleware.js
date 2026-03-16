import jwt from "jsonwebtoken";

const readToken = (req) => {
  const bearer = req.headers.authorization;
  if (bearer && bearer.startsWith("Bearer ")) {
    return bearer.split(" ")[1];
  }
  return req.cookies?.token;
};

export const optionalAuth = (req, _res, next) => {
  const token = readToken(req);
  if (!token) {
    return next();
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_error) {
    req.user = null;
  }

  return next();
};

export const requireAuth = (req, res, next) => {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
