import 'dotenv/config'
import jwt from "jsonwebtoken";
import { app } from './app'

import { verifyToken } from "./middleware/auth";
import statesRoute from "./routes/states";
import credentialsRoute from "./routes/credentials";
import coursesRoute from "./routes/courses";
import searchRoute from "./routes/search";
import overviewDetails from "./routes/overviewDetails";
import outcomes from "./routes/outcomes";
import tuitionRoute from "./routes/tuition";



const PORT = process.env.PORT || 8000;
console.log("SERVER.TS EXECUTED");

// ✅ REGISTER ROUTES HERE
app.get("/debug", (req, res) => {
  console.log("DEBUG HIT");
  res.send("DEBUG WORKING");
});

app.use("/states", verifyToken,statesRoute);
app.use("/credentials", verifyToken,credentialsRoute);
app.use("/courses", verifyToken,coursesRoute);
app.use("/search", verifyToken, searchRoute);
app.use('/overview',verifyToken, overviewDetails);
app.use('/outcomes', verifyToken, outcomes);
app.use('/tuition', verifyToken, tuitionRoute);
app.get("/check", (req, res) => {
  console.log("HEADERS:", req.headers);
  res.json({ status: "ok", headers: req.headers });
});
app.get("/get-token", (req, res) => {
  const token = jwt.sign(
    { userId: 1, role: "admin" }, // payload
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }
  );

  res.json({ token });
});
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});