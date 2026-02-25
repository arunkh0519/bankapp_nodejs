import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import pool from '../src/db.js'

dotenv.config()

const [name, mobile, password] = process.argv.slice(2)

if (!name || !mobile || !password) {
  console.log('Usage: node scripts/create-admin.js "Name" "Mobile" "Password"')
  process.exit(1)
}

const run = async () => {
  const [existing] = await pool.query('SELECT id FROM users WHERE mobile = ? LIMIT 1', [mobile])
  if (existing[0]) {
    console.log('Mobile already exists')
    process.exit(1)
  }
  const hash = await bcrypt.hash(password, 10)
  await pool.query(
    'INSERT INTO users (name, mobile, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, mobile, hash, 'ADMIN']
  )
  console.log('Admin created')
  process.exit(0)
}

run()
