export function formatGhs(amount) {
  return `GHS ${Number(amount).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// pickup_date is a plain date ("2026-10-30"); parse it as local, not UTC
export function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatDateTime(ts) {
  return new Date(ts).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// PostgREST returns a one-to-one embed as an object, but older setups return an array.
export function one(x) {
  return Array.isArray(x) ? (x[0] ?? null) : (x ?? null)
}

// Turn database/API errors into messages a user can act on.
export function friendlyError(error) {
  if (!error) return null
  const msg = error.message || String(error)
  if (error.code === '23505') return 'You already have an active offer on this request.'
  if (error.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'You are not allowed to do that. The request may have closed, or this belongs to someone else.'
  }
  if (error.code === '23514') return 'Some values are not valid. Check amounts are above zero and all fields are filled.'
  if (error.code === 'PGRST116') return 'Not found, or you do not have access to it.'
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Network problem. Check your connection and try again.'
  return msg
}
