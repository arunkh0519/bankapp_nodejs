import { createUser, getUsers, getAllTransactions } from '../services/adminService.js'

export const createUserHandler = async (req, res) => {
  const { name, mobile, password } = req.body || {}
  if (!name || !mobile || !password) {
    return res.status(400).json({ message: 'Name, mobile, password required' })
  }
  const result = await createUser({ name, mobile, password })
  if (result.error) {
    return res.status(400).json({ message: result.error })
  }
  res.status(201).json({ id: result.id })
}

export const listUsersHandler = async (req, res) => {
  const users = await getUsers()
  res.json(users)
}

export const listTransactionsHandler = async (req, res) => {
  const txns = await getAllTransactions()
  res.json(txns)
}
