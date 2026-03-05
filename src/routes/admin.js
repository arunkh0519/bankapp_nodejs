import { Router } from 'express'
import { auth } from '../middlewares/auth.js'
import { createUserHandler, listUsersHandler, listTransactionsHandler } from '../controllers/adminController.js'

const router = Router()

router.use(auth(['ADMIN']))

router.post('/users', createUserHandler)
router.get('/users', listUsersHandler)
router.get('/transactions', listTransactionsHandler)

export default router
