import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

// import jwt from "jsonwebtoken";
import { app } from "./app";

// import { verifyToken } from "./middleware/auth";
import statesRoute from "./routes/states";
import credentialsRoute from "./routes/credentials";
import coursesRoute from "./routes/courses";
import searchRoute from "./routes/search";
import overviewDetails from "./routes/overviewDetails";
import outcomes from "./routes/outcomes";
import tuitionRoute from "./routes/tuition";
import campusRoute from "./routes/campus";
import programsRoute from "./routes/programs";
import schoolLevelSearchRouter from "./routes/schoollevelsearch";
import collegesRoute from "./routes/colleges";
import compareRoute from "./routes/compare";
import userRoute from "./routes/user";
import authRoute from "./routes/auth";
import profileRoute, { accountRouter } from "./routes/profile";
import savedCollegesRoute from "./routes/savedColleges";
import degreeLevelsRoute from "./routes/degreeLevels";
import reportRoute from "./routes/report";
import athleticsRoute from "./routes/athletics";
import popularCategoriesRoute from "./routes/popularCategories";
import jwt from "jsonwebtoken";
import pool from "./db/client";

const PORT = process.env.PORT || 8000;
console.log("SERVER.TS EXECUTED");

// ✅ REGISTER ROUTES HERE
app.get("/debug", (req, res) => {
  console.log("DEBUG HIT");
  res.send("DEBUG WORKING");
});

app.use("/states", statesRoute);
app.use("/credentials", credentialsRoute);
app.use("/courses", coursesRoute);
app.use("/search", searchRoute);
app.use("/overview", overviewDetails);
app.use("/outcomes", outcomes);
app.use("/tuition", tuitionRoute);
app.use("/campus", campusRoute);
app.use("/programs", programsRoute);
app.use("/schools", schoolLevelSearchRouter);
app.use("/colleges", collegesRoute);
app.use("/compare", compareRoute);
app.use("/user", userRoute);
app.use("/auth", authRoute);
app.use("/profile", profileRoute);
app.use("/account", accountRouter);
app.use("/saved-colleges", savedCollegesRoute);
app.use("/degree-levels", degreeLevelsRoute);
app.use("/report", reportRoute);
app.use("/athletics", athleticsRoute);
app.use("/popular-categories", popularCategoriesRoute);
// app.get("/check", (req, res) => {
//   console.log("HEADERS:", req.headers);
//   res.json({ status: "ok", headers: req.headers });
// });
// LOCAL DEV ONLY — mints an app JWT without going through Firebase, so
// Postman can get a Bearer token for verifyToken-protected routes.
// GET /get-token            → token for the first active usdusers row
// GET /get-token?uid=<uid>  → token for a specific firebase_uid
app.get("/get-token", async (req, res) => {
  try {
    const uidParam =
      typeof req.query.uid === "string" ? req.query.uid : undefined;

    let firebaseUid = uidParam;
    if (!firebaseUid) {
      const result = await pool.query<{ firebase_uid: string }>(
        "SELECT firebase_uid FROM usdusers WHERE is_active = true ORDER BY id LIMIT 1",
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "No active usdusers found" });
        return;
      }
      firebaseUid = result.rows[0].firebase_uid;
    }

    const token = jwt.sign(
      { sub: firebaseUid },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" },
    );

    res.json({ token, firebase_uid: firebaseUid });
  } catch (err) {
    console.error("[/get-token] error:", err);
    res.status(500).json({ error: "Failed to mint token" });
  }
});
app.get("/", (req, res) =>
  res.json({ status: "ok", message: "API is running" }),
);
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
