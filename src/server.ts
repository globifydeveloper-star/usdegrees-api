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
// app.get("/check", (req, res) => {
//   console.log("HEADERS:", req.headers);
//   res.json({ status: "ok", headers: req.headers });
// });
// app.get("/get-token", (req, res) => {
//   const token = jwt.sign(
//     { userId: 1, role: "admin" }, // payload
//     process.env.JWT_SECRET as string,
//     { expiresIn: "1h" },
//   );

//   res.json({ token });
// });
app.get("/", (req, res) => res.json({ status: "ok", message: "API is running" }));
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});