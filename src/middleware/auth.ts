import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "your_secret_key";

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  console.log("AUTH HEADER:", SECRET);
  console.log("verifyToken hit");
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    (req as any).user = decoded; // attach decoded payload to request if needed
    console.log("Token verified successfully");
    next();
  } catch (err) {
    console.error("Token verification failed:", (err as Error).message);
    res.status(403).json({ error: "Invalid or expired token" });
  }
};