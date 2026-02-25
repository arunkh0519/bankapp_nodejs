const app = document.getElementById('app')

const state = {
  admin: {
    users: [],
    txns: [],
    loading: false,
    loaded: false,
    error: ''
  },
  user: {
    accounts: [],
    txns: [],
    loading: false,
    loaded: false,
    createError: '',
    transferError: '',
    transferStatus: '',
    transferId: null,
    otp: '',
    fromAccountId: ''
  }
}

const getToken = () => localStorage.getItem('bank_token')
const setToken = (token) => localStorage.setItem('bank_token', token)
const clearToken = () => localStorage.removeItem('bank_token')

const getUser = () => {
  const token = getToken()
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
  try {
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

const api = async (path, options = {}) => {
  const headers = options.headers || {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'

  const res = await fetch(path, { ...options, headers })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    if (res.status === 401) {
      clearToken()
      location.hash = '/'
    }
    throw new Error(data?.message || 'Request failed')
  }
  return data
}

const route = () => {
  const hash = location.hash.replace('#', '')
  return hash || '/'
}

const requireRole = (role, redirect) => {
  const user = getUser()
  if (!user) {
    location.hash = redirect
    return null
  }
  if (role && user.role !== role) {
    location.hash = '/'
    return null
  }
  return user
}

const money = (value) => `INR ${Number(value || 0).toFixed(2)}`

const render = () => {
  const r = route()
  if (r === '/') return renderLanding()
  if (r === '/login') return renderUserLogin()
  if (r === '/admin-login') return renderAdminLogin()
  if (r === '/admin') return renderAdmin()
  if (r === '/app') return renderUser()
  location.hash = '/'
}

const renderLanding = () => {
  app.innerHTML = `
    <div class="page center">
      <div class="hero">
        <div class="eyebrow">Bank App</div>
        <h1>Fast, simple banking flows</h1>
        <p>JWT auth, account management, OTP transfers, and clean transaction history.</p>
        <div class="hero-actions">
          <a class="btn primary" href="#/login">User Login</a>
          <a class="btn secondary" href="#/admin-login">Admin Login</a>
        </div>

      </div>
    </div>
  `
}

const renderAdminLogin = () => {
  app.innerHTML = `
    <div class="page center">
      <div class="auth-card">
        <div class="card-title">Admin Login</div>
        <p class="muted">Secure access for admin operations.</p>
        <form class="form" id="admin-login-form">
          <input class="input" name="mobile" placeholder="Mobile number" />
          <input class="input" name="password" placeholder="Password" type="password" />
          ${state.admin.error ? `<div class="error">${state.admin.error}</div>` : ''}
          <button class="btn primary" type="submit">Sign in</button>
        </form>
        <div class="link-row"><a href="#/">Back to home</a></div>
      </div>
    </div>
  `

  const form = document.getElementById('admin-login-form')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    state.admin.error = ''
    const data = new FormData(form)
    try {
      const res = await api('/api/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          mobile: String(data.get('mobile') || '').trim(),
          password: String(data.get('password') || '')
        })
      })
      setToken(res.token)
      location.hash = '/admin'
    } catch (err) {
      state.admin.error = err.message
      renderAdminLogin()
    }
  })
}

const renderUserLogin = () => {
  app.innerHTML = `
    <div class="page center">
      <div class="auth-card">
        <div class="card-title">User Login</div>
        <p class="muted">Access your accounts and transfer funds.</p>
        <form class="form" id="user-login-form">
          <input class="input" name="mobile" placeholder="Mobile number" />
          <input class="input" name="password" placeholder="Password" type="password" />
          ${state.user.transferError ? `<div class="error">${state.user.transferError}</div>` : ''}
          <button class="btn primary" type="submit">Sign in</button>
        </form>
        <div class="link-row"><a href="#/">Back to home</a></div>
      </div>
    </div>
  `

  const form = document.getElementById('user-login-form')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    state.user.transferError = ''
    const data = new FormData(form)
    try {
      const res = await api('/api/auth/user/login', {
        method: 'POST',
        body: JSON.stringify({
          mobile: String(data.get('mobile') || '').trim(),
          password: String(data.get('password') || '')
        })
      })
      setToken(res.token)
      location.hash = '/app'
    } catch (err) {
      state.user.transferError = err.message
      renderUserLogin()
    }
  })
}

const renderAdmin = () => {
  const user = requireRole('ADMIN', '/admin-login')
  if (!user) return

  if (!state.admin.loaded && !state.admin.loading) loadAdmin()

  app.innerHTML = `
    <div class="page">
      <div class="topbar">
        <div>
          <div class="title">Admin Console</div>
          <div class="subtitle">Create users and monitor transfers</div>
        </div>
        <div class="topbar-right">
          <div class="chip">${user.role}</div>
          <div class="user">${user.name}</div>
          <button class="btn ghost" id="logout">Logout</button>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-title">Create User</div>
          <form class="form" id="create-user-form">
            <input class="input" name="name" placeholder="Full name" />
            <input class="input" name="mobile" placeholder="Mobile number" />
            <input class="input" name="password" placeholder="Password" type="password" />
            ${state.admin.error ? `<div class="error">${state.admin.error}</div>` : ''}
            <button class="btn primary" type="submit">Create user</button>
          </form>
        </div>

        <div class="card">
          <div class="card-title">Users</div>
          <div class="table">
            <div class="row head">
              <div>Name</div>
              <div>Mobile</div>
              <div>Role</div>
            </div>
            ${state.admin.users.length ? state.admin.users.map((u) => `
              <div class="row">
                <div>${u.name}</div>
                <div>${u.mobile}</div>
                <div>${u.role}</div>
              </div>
            `).join('') : `<div class="row"><div class="muted">No users yet</div></div>`}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">All Transactions</div>
        <div class="table">
          <div class="row head">
            <div>Reference</div>
            <div>From</div>
            <div>To</div>
            <div>Amount</div>
            <div>Status</div>
          </div>
          ${state.admin.txns.length ? state.admin.txns.map((t) => `
            <div class="row">
              <div>${t.reference}</div>
              <div>${t.from_account_no}</div>
              <div>${t.to_account_no}</div>
              <div>${money(t.amount)}</div>
              <div class="status ${String(t.status).toLowerCase()}">${t.status}</div>
            </div>
          `).join('') : `<div class="row"><div class="muted">No transactions yet</div></div>`}
        </div>
      </div>
    </div>
  `

  const logout = document.getElementById('logout')
  logout.addEventListener('click', () => {
    clearToken()
    location.hash = '/'
  })

  const form = document.getElementById('create-user-form')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    state.admin.error = ''
    const data = new FormData(form)
    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: String(data.get('name') || '').trim(),
          mobile: String(data.get('mobile') || '').trim(),
          password: String(data.get('password') || '')
        })
      })
      form.reset()
      await loadAdmin(true)
    } catch (err) {
      state.admin.error = err.message
      renderAdmin()
    }
  })
}

const renderUser = () => {
  const user = requireRole('USER', '/login')
  if (!user) return

  if (!state.user.loaded && !state.user.loading) loadUser()

  app.innerHTML = `
    <div class="page">
      <div class="topbar">
        <div>
          <div class="title">User Dashboard</div>
          <div class="subtitle">Manage accounts and transfers</div>
        </div>
        <div class="topbar-right">
          <div class="chip">${user.role}</div>
          <div class="user">${user.name}</div>
          <button class="btn ghost" id="logout">Logout</button>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-title">Add Account</div>
          <form class="form" id="create-account-form">
            <input class="input" name="accountNo" placeholder="Account number" />
            <input class="input" name="bankName" placeholder="Bank name" />
            <input class="input" name="balance" placeholder="Initial balance" />
            ${state.user.createError ? `<div class="error">${state.user.createError}</div>` : ''}
            <button class="btn primary" type="submit">Add account</button>
          </form>
        </div>

        <div class="card">
          <div class="card-title">Your Accounts</div>
          <div class="table">
            <div class="row head">
              <div>Account</div>
              <div>Bank</div>
              <div>Balance</div>
            </div>
            ${state.user.accounts.length ? state.user.accounts.map((a) => `
              <div class="row">
                <div>${a.account_no}</div>
                <div>${a.bank_name}</div>
                <div>${money(a.balance)}</div>
              </div>
            `).join('') : `<div class="row"><div class="muted">No accounts yet</div></div>`}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Fund Transfer</div>
        <form class="form" id="transfer-form">
          <select class="input" name="fromAccountId" id="fromAccountId">
            <option value="">Select from account</option>
            ${state.user.accounts.map((a) => `
              <option value="${a.id}" ${String(a.id) === String(state.user.fromAccountId) ? 'selected' : ''}>
                ${a.account_no} - ${a.bank_name}
              </option>
            `).join('')}
          </select>
          <input class="input" name="toAccountNo" placeholder="To account number" />
          <input class="input" name="amount" placeholder="Amount" />
          ${state.user.transferError ? `<div class="error">${state.user.transferError}</div>` : ''}
          <button class="btn primary" type="submit">Generate OTP</button>
        </form>

        ${state.user.transferId ? `
          <div class="otp-panel">
            <div class="otp-box">
              <div class="otp-title">OTP</div>
              <div class="otp-value">${state.user.otp}</div>
              <div class="muted">Displayed here for assessment</div>
            </div>
            <form class="form" id="verify-form">
              <input class="input" name="otp" placeholder="Enter OTP" />
              <button class="btn secondary" type="submit">Verify transfer</button>
            </form>
          </div>
        ` : ''}

        ${state.user.transferStatus ? `
          <div class="status-banner ${state.user.transferStatus.startsWith('Success') ? 'success' : 'failed'}">
            ${state.user.transferStatus}
          </div>
        ` : ''}
      </div>

      <div class="card">
        <div class="card-title">Transactions</div>
        <div class="table">
          <div class="row head">
            <div>Reference</div>
            <div>From</div>
            <div>To</div>
            <div>Amount</div>
            <div>Status</div>
          </div>
          ${state.user.txns.length ? state.user.txns.map((t) => `
            <div class="row">
              <div>${t.reference}</div>
              <div>${t.from_account_no}</div>
              <div>${t.to_account_no}</div>
              <div>${money(t.amount)}</div>
              <div class="status ${String(t.status).toLowerCase()}">${t.status}</div>
            </div>
          `).join('') : `<div class="row"><div class="muted">No transactions yet</div></div>`}
        </div>
      </div>
    </div>
  `

  const logout = document.getElementById('logout')
  logout.addEventListener('click', () => {
    clearToken()
    location.hash = '/'
  })

  const createForm = document.getElementById('create-account-form')
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    state.user.createError = ''
    const data = new FormData(createForm)
    try {
      await api('/api/user/accounts', {
        method: 'POST',
        body: JSON.stringify({
          accountNo: String(data.get('accountNo') || '').trim(),
          bankName: String(data.get('bankName') || '').trim(),
          balance: Number(data.get('balance') || 0)
        })
      })
      createForm.reset()
      await loadUser(true)
    } catch (err) {
      state.user.createError = err.message
      renderUser()
    }
  })

  const transferForm = document.getElementById('transfer-form')
  transferForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    state.user.transferError = ''
    state.user.transferStatus = ''
    const data = new FormData(transferForm)
    const fromAccountId = String(data.get('fromAccountId') || '')
    state.user.fromAccountId = fromAccountId
    try {
      const res = await api('/api/user/transfers/initiate', {
        method: 'POST',
        body: JSON.stringify({
          fromAccountId: Number(fromAccountId),
          toAccountNo: String(data.get('toAccountNo') || '').trim(),
          amount: Number(data.get('amount') || 0)
        })
      })
      state.user.transferId = res.transferId
      state.user.otp = res.otp
      renderUser()
    } catch (err) {
      state.user.transferError = err.message
      renderUser()
    }
  })

  const verifyForm = document.getElementById('verify-form')
  if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      state.user.transferError = ''
      state.user.transferStatus = ''
      const data = new FormData(verifyForm)
      try {
        const res = await api('/api/user/transfers/verify', {
          method: 'POST',
          body: JSON.stringify({
            transferId: state.user.transferId,
            otp: String(data.get('otp') || '').trim()
          })
        })
        state.user.transferStatus = `Success: ${res.reference}`
        state.user.transferId = null
        state.user.otp = ''
        await loadUser(true)
      } catch (err) {
        state.user.transferError = err.message
        state.user.transferStatus = 'Failed'
        renderUser()
      }
    })
  }
}

const loadAdmin = async (force) => {
  if (state.admin.loading) return
  if (state.admin.loaded && !force) return
  state.admin.loading = true
  renderAdmin()
  try {
    const [users, txns] = await Promise.all([
      api('/api/admin/users'),
      api('/api/admin/transactions')
    ])
    state.admin.users = users
    state.admin.txns = txns
    state.admin.error = ''
  } catch (err) {
    state.admin.error = err.message
  } finally {
    state.admin.loading = false
    state.admin.loaded = true
    renderAdmin()
  }
}

const loadUser = async (force) => {
  if (state.user.loading) return
  if (state.user.loaded && !force) return
  state.user.loading = true
  renderUser()
  try {
    const [accounts, txns] = await Promise.all([
      api('/api/user/accounts'),
      api('/api/user/transactions')
    ])
    state.user.accounts = accounts
    state.user.txns = txns
    if (!state.user.fromAccountId && accounts[0]) {
      state.user.fromAccountId = String(accounts[0].id)
    }
    state.user.createError = ''
  } catch (err) {
    state.user.createError = err.message
  } finally {
    state.user.loading = false
    state.user.loaded = true
    renderUser()
  }
}

window.addEventListener('hashchange', render)
window.addEventListener('load', render)
