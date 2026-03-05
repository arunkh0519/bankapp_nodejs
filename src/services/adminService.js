import bcrypt from 'bcryptjs'
import pool from '../db.js'
import logger from '../logger.js'

export const createUser = async ({ name, mobile, password }) => {
  const [existing] = await pool.query('SELECT id FROM users WHERE mobile = ? LIMIT 1', [mobile])
  if (existing[0]) {
    return { error: 'Mobile already exists' }
  }
  const hash = await bcrypt.hash(password, 10)
  const [result] = await pool.query(
    'INSERT INTO users (name, mobile, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, mobile, hash, 'USER']
  )
  logger.info(`User created: name=${name}, mobile=${mobile}`)
  return { id: result.insertId }
}

export const getUsers = async () => {
  const [rows] = await pool.query(
    'SELECT id, name, mobile, role, created_at FROM users ORDER BY id DESC'
  )
  return rows
}

export const getAllTransactions = async () => {
  const [rows] = await pool.query(
    `SELECT t.id, t.amount, t.status, t.reference, t.created_at,
            fa.account_no AS from_account_no,
            ta.account_no AS to_account_no,
            fu.name AS from_user,
            tu.name AS to_user
     FROM transactions t
     JOIN accounts fa ON fa.id = t.from_account_id
     JOIN accounts ta ON ta.id = t.to_account_id
     JOIN users fu ON fu.id = fa.user_id
     JOIN users tu ON tu.id = ta.user_id
     ORDER BY t.id DESC`
  )
  return rows
}
