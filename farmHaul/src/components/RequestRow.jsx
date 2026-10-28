import { Link } from 'react-router-dom'
import { formatDate } from '../lib/format'
import Icon from './Icon'

// Compact two-line card for lists: what and how much, then route and date.
// `side` is whatever belongs on the right (a status badge, price, offer count).
export default function RequestRow({ request, to, side, faded = false }) {
  const body = (
    <>
      <span className="load-icon"><Icon name="package" size={20} /></span>
      <div className="row-main">
        <p className="row-title">
          {request.produce} <span className="row-qty">· {Number(request.quantity)} {request.unit}</span>
        </p>
        <p className="row-sub">
          {request.pickup_area} <Icon name="arrow" size={14} /> {request.destination_area}
          <span className="row-dot">·</span>
          {formatDate(request.pickup_date)}
        </p>
      </div>
      {side && <div className="row-side">{side}</div>}
      {to && <Icon name="chevron" size={18} className="row-chevron" />}
    </>
  )
  const className = `card row-card ${faded ? 'faded' : ''}`
  return to ? <Link to={to} className={`${className} card-link`}>{body}</Link> : <div className={className}>{body}</div>
}
