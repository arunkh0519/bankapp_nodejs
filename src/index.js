import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/user.js'

dotenv.config()

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/user', userRoutes)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')
app.use(express.static(publicDir))
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'))
})

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`server running on ${port}`)
})
