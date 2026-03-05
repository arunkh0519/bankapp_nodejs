import {
  createAccount,
  getAccounts,
  getTransactions,
  initiateTransfer,
  verifyTransfer
} from '../services/userService.js'

export const createAccountHandler = async (req, res) => {
  const { accountNo, bankName, balance } = req.body || {}
  if (!accountNo || !bankName) {
    return res.status(400).json({ message: 'Account number and bank name required' })
  }
  const result = await createAccount({
    userId: req.user.id,
    accountNo,
    bankName,
    balance: Number(balance || 0)
  })
  if (result.error) {
    return res.status(400).json({ message: result.error })
  }
  res.status(201).json({ id: result.id })
}

export const listAccountsHandler = async (req, res) => {
  const accounts = await getAccounts(req.user.id)
  res.json(accounts)
}

export const listTransactionsHandler = async (req, res) => {
  const txns = await getTransactions(req.user.id)
  res.json(txns)
}

export const initiateTransferHandler = async (req, res) => {
  const { fromAccountId, toAccountNo, amount } = req.body || {}
  if (!fromAccountId || !toAccountNo || !amount) {
    return res.status(400).json({ message: 'From account, to account, amount required' })
  }
  const result = await initiateTransfer({
    userId: req.user.id,
    fromAccountId,
    toAccountNo,
    amount: Number(amount)
  })
  if (result.error) {
    return res.status(400).json({ message: result.error })
  }
  res.status(201).json(result)
}

export const verifyTransferHandler = async (req, res) => {
  const { transferId, otp } = req.body || {}
  if (!transferId || !otp) {
    return res.status(400).json({ message: 'Transfer ID and OTP required' })
  }
  const result = await verifyTransfer({
    userId: req.user.id,
    transferId,
    otp
  })
  if (result.error) {
    return res.status(400).json({ message: result.error })
  }
  res.json({ message: 'Transfer successful', reference: result.reference })
}
