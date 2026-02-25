import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db.js'

const issueToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, mobile: user.mobile },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  )
}

const findByMobileRole = async (mobile, role) => {
  const [rows] = await pool.query(
    'SELECT id, name, mobile, password_hash, role FROM users WHERE mobile = ? AND role = ? LIMIT 1',
    [mobile, role]
  )
  return rows[0]
}

export const loginWithRole = async (mobile, password, role) => {
  const user = await findByMobileRole(mobile, role)
  if (!user) {
    return null
  }
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) {
    return null
  }
  const token = issueToken(user)
  return { token, user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role } }
}
