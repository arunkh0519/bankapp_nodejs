import { Router } from 'express'
import { auth } from '../middlewares/auth.js'
import {
  createAccountHandler,
  listAccountsHandler,
  listTransactionsHandler,
  initiateTransferHandler,
  verifyTransferHandler
} from '../controllers/userController.js'

const router = Router()

router.use(auth(['USER']))

router.post('/accounts', createAccountHandler)
router.get('/accounts', listAccountsHandler)
router.get('/transactions', listTransactionsHandler)
router.post('/transfers/initiate', initiateTransferHandler)
router.post('/transfers/verify', verifyTransferHandler)

export default router
