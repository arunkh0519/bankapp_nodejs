import { loginWithRole } from '../services/authService.js'

export const adminLogin = async (req, res) => {
  const { mobile, password } = req.body || {}
  if (!mobile || !password) {
    return res.status(400).json({ message: 'Mobile and password required' })
  }
  const result = await loginWithRole(mobile, password, 'ADMIN')
  if (!result) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  res.json(result)
}

export const userLogin = async (req, res) => {
  const { mobile, password } = req.body || {}
  if (!mobile || !password) {
    return res.status(400).json({ message: 'Mobile and password required' })
  }
  const result = await loginWithRole(mobile, password, 'USER')
  if (!result) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }
  res.json(result)
}
