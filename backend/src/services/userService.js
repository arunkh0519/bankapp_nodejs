import pool from '../db.js'
import logger from '../src/logger.js'

const generateOtp = () => {
  const value = Math.floor(100000 + Math.random() * 900000)
  return String(value)
}

export const createAccount = async ({ userId, accountNo, bankName, balance }) => {
  const [existing] = await pool.query('SELECT id FROM accounts WHERE account_no = ? LIMIT 1', [accountNo])
  if (existing[0]) {
    return { error: 'Account number already exists' }
  }
  const [result] = await pool.query(
    'INSERT INTO accounts (user_id, account_no, bank_name, balance) VALUES (?, ?, ?, ?)',
    [userId, accountNo, bankName, balance]
  )
  logger.info(`Account created: userId=${userId}, accountNo=${accountNo}, bankName=${bankName}, balance=${balance}`)
  return { id: result.insertId }
}

export const getAccounts = async (userId) => {
  const [rows] = await pool.query(
    'SELECT id, account_no, bank_name, balance, created_at FROM accounts WHERE user_id = ? ORDER BY id DESC',
    [userId]
  )
  return rows
}

export const getTransactions = async (userId) => {
  const [rows] = await pool.query(
    `SELECT t.id, t.amount, t.status, t.reference, t.created_at,
            fa.account_no AS from_account_no,
            ta.account_no AS to_account_no,
            fa.user_id AS from_user_id,
            ta.user_id AS to_user_id
     FROM transactions t
     JOIN accounts fa ON fa.id = t.from_account_id
     JOIN accounts ta ON ta.id = t.to_account_id
     WHERE fa.user_id = ? OR ta.user_id = ?
     ORDER BY t.id DESC`,
    [userId, userId]
  )
  return rows
}

export const initiateTransfer = async ({ userId, fromAccountId, toAccountNo, amount }) => {
  const [fromRows] = await pool.query(
    'SELECT id, balance FROM accounts WHERE id = ? AND user_id = ? LIMIT 1',
    [fromAccountId, userId]
  )
  const fromAccount = fromRows[0]
  if (!fromAccount) {
    return { error: 'Invalid from account' }
  }

  const [toRows] = await pool.query(
    'SELECT id FROM accounts WHERE account_no = ? LIMIT 1',
    [toAccountNo]
  )
  const toAccount = toRows[0]
  if (!toAccount) {
    return { error: 'To account not found' }
  }

  if (Number(amount) <= 0) {
    return { error: 'Amount must be greater than zero' }
  }

  if (Number(fromAccount.balance) < Number(amount)) {
    return { error: 'Insufficient balance' }
  }

  const otp = generateOtp()
  const ttl = Number(process.env.OTP_TTL_MINUTES || 5)
  const [result] = await pool.query(
    'INSERT INTO transfer_otps (from_account_id, to_account_id, amount, otp, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))',
    [fromAccountId, toAccount.id, amount, otp, ttl]
  )
  logger.info(`Transfer initiated: userId=${userId}, fromAccountId=${fromAccountId}, toAccountNo=${toAccountNo}, amount=${amount}`)
  return { transferId: result.insertId, otp }
}

export const verifyTransfer = async ({ userId, transferId, otp }) => {
  const [rows] = await pool.query(
    `SELECT t.id, t.from_account_id, t.to_account_id, t.amount, t.otp, t.status, t.expires_at,
            fa.user_id AS from_user_id
     FROM transfer_otps t
     JOIN accounts fa ON fa.id = t.from_account_id
     WHERE t.id = ?
     LIMIT 1`,
    [transferId]
  )
  const transfer = rows[0]
  if (!transfer || transfer.from_user_id !== userId) {
    return { error: 'Invalid transfer' }
  }

  if (transfer.status !== 'PENDING') {
    return { error: 'Transfer already processed' }
  }

  const now = new Date()
  if (new Date(transfer.expires_at) < now) {
    await pool.query('UPDATE transfer_otps SET status = ? WHERE id = ?', ['EXPIRED', transferId])
    return { error: 'OTP expired' }
  }

  if (String(transfer.otp) !== String(otp)) {
    await pool.query('UPDATE transfer_otps SET status = ? WHERE id = ?', ['FAILED', transferId])
    return { error: 'Invalid OTP' }
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [fromRows] = await conn.query('SELECT id, balance FROM accounts WHERE id = ? FOR UPDATE', [transfer.from_account_id])
    const [toRows] = await conn.query('SELECT id, balance FROM accounts WHERE id = ? FOR UPDATE', [transfer.to_account_id])

    if (!fromRows[0] || !toRows[0]) {
      await conn.query('UPDATE transfer_otps SET status = ? WHERE id = ?', ['FAILED', transferId])
      await conn.commit()
      return { error: 'Account not found' }
    }

    if (Number(fromRows[0].balance) < Number(transfer.amount)) {
      await conn.query('UPDATE transfer_otps SET status = ? WHERE id = ?', ['FAILED', transferId])
      await conn.commit()
      return { error: 'Insufficient balance' }
    }

    await conn.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [transfer.amount, transfer.from_account_id])
    await conn.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [transfer.amount, transfer.to_account_id])

    const reference = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`
    await conn.query(
      'INSERT INTO transactions (from_account_id, to_account_id, amount, status, reference) VALUES (?, ?, ?, ?, ?)',
      [transfer.from_account_id, transfer.to_account_id, transfer.amount, 'SUCCESS', reference]
    )
    await conn.query('UPDATE transfer_otps SET status = ? WHERE id = ?', ['SUCCESS', transferId])
    logger.info(`Transfer verified: userId=${userId}, transferId=${transferId}, amount=${transfer.amount}, reference=${reference}`)
    await conn.commit()
    return { reference }
  } catch (err) {
    await conn.rollback()
    return { error: 'Transfer failed' }
  } finally {
    conn.release()
  }
}
