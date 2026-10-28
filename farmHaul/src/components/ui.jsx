import { OFFER_STATUS_LABELS, STATUS_LABELS } from '../lib/constants'
import { friendlyError } from '../lib/format'
import Icon from './Icon'

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{STATUS_LABELS[status] ?? status}</span>
}

export function OfferBadge({ status }) {
  return <span className={`badge offer-${status.toLowerCase()}`}>{OFFER_STATUS_LABELS[status] ?? status}</span>
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span className="muted">{label}</span>
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="error-box" role="alert">
      <p>{typeof error === 'string' ? error : friendlyError(error)}</p>
      {onRetry && <button className="btn btn-small" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function Empty({ title, icon = 'package', children }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name={icon} size={26} /></span>
      <p className="empty-title">{title}</p>
      {children}
    </div>
  )
}

export function Field({ label, error, hint, children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}
