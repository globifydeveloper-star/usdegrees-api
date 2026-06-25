import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import path from 'path'

export const app = express()

app.use((req, res, next) => {
  console.log("➡️ Incoming:", req.method, req.url);
  next();
});

const allowedOrigins = [
  'http://localhost:3000',
  'https://us-degree-web.vercel.app',
  process.env.ALLOWED_ORIGIN,
].filter(Boolean) as string[]

app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS blocked: ${origin}`))
    }
  },
  credentials: true
}))
app.use(morgan('dev'))
app.use(express.json())

app.use("/public", express.static(path.join(__dirname, "../public")));

app.get('/health', (_, res) => res.json({ status: 'ok' }))