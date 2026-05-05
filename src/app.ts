import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

export const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL }))
app.use(morgan('dev'))
app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok' }))