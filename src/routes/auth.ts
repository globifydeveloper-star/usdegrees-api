import { Router, Response } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db/client";
import { verifyToken } from "../middleware/auth";
import { User, UserProfile, ApiError, AuthRequest } from "../types/user";

const router = Router();
const SECRET = process.env.JWT_SECRET || "your_secret_key";

/**
 * Helper to generate JWT Token
 */
const generateToken = (user: { id: number; email: string; role: string }): string => {
  return jwt.sign(
    { id: user.id, userId: user.id, email: user.email, role: user.role },
    SECRET,
    { expiresIn: "24h" }
  );
};

/**
 * POST /auth/signup
 * Registers a new user with credentials
 */
router.post("/signup", async (req: AuthRequest, res: Response<{ token: string; user: UserProfile } | ApiError>) => {
  try {
    const { email, password, display_name, role } = req.body;

    if (!email || !password || !display_name) {
      return res.status(400).json({ error: "Email, password, and display name are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await pool.query<User>(
      "SELECT id FROM usdusers WHERE email = $1",
      [email.toLowerCase().trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "User with this email already registered" });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Insert user into usdusers table
    const result = await pool.query<User>(
      `INSERT INTO usdusers
         (email, display_name, password, auth_provider, role, email_verified, created_at, last_login)
       VALUES ($1, $2, $3, 'credentials', $4, false, NOW(), NOW())
       RETURNING id, display_name, email, role, profile_image, email_verified`,
      [email.toLowerCase().trim(), display_name.trim(), hashedPassword, role?.toLowerCase().trim() || 'student']
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        display_name: newUser.display_name,
        email: newUser.email,
        profile_image: newUser.profile_image,
        role: newUser.role,
        email_verified: newUser.email_verified,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      error: "Signup failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /auth/login
 * Log in with email and password
 */
router.post("/login", async (req: AuthRequest, res: Response<{ token: string; user: UserProfile } | ApiError>) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Fetch user including the hashed password
    const result = await pool.query<User>(
      `SELECT id, display_name, email, password, role, profile_image, email_verified
       FROM usdusers WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    // If user exists but has no password (registered via social auth)
    if (!user.password) {
      return res.status(401).json({
        error: "This email is registered with another authentication provider. Please log in using that provider.",
      });
    }

    // Compare passwords
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Update last login
    await pool.query("UPDATE usdusers SET last_login = NOW() WHERE id = $1", [user.id]);

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        display_name: user.display_name,
        email: user.email,
        profile_image: user.profile_image,
        role: user.role,
        email_verified: user.email_verified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /auth/me
 * Retrieves current logged-in user profile using verifyToken middleware
 */
router.get("/me", verifyToken, async (req: AuthRequest, res: Response<UserProfile | ApiError>) => {
  try {
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "User unauthorized" });
    }

    const result = await pool.query<User>(
      `SELECT id, display_name, email, role, profile_image, email_verified
       FROM usdusers WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      display_name: user.display_name,
      email: user.email,
      profile_image: user.profile_image,
      role: user.role,
      email_verified: user.email_verified,
    });
  } catch (error) {
    console.error("Fetch me error:", error);
    res.status(500).json({
      error: "Failed to retrieve user profile",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
