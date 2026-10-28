import { formatDate } from '../lib/format'
import Icon from './Icon'

// Load + route summary used on cards and detail pages for both roles.
export default function RequestSummary({ request, showLandmarks = false }) {
  return (
    <div className="summary">
      <div className="summary-load">
        <span className="load-icon"><Icon name="package" size={20} /></span>
        <div>
          <p className="load-title">{request.produce}</p>
          <p className="load-qty">{Number(request.quantity)} {request.unit}</p>
        </div>
      </div>

      <ol className="route">
        <li>
          <span className="route-dot" />
          <div>
            <span className="route-area">{request.pickup_area}</span>
            {showLandmarks && <span className="route-landmark">{request.pickup_landmark}</span>}
          </div>
        </li>
        <li>
          <span className="route-dot route-dot-end" />
          <div>
            <span className="route-area">{request.destination_area}</span>
            {showLandmarks && <span className="route-landmark">{request.destination_landmark}</span>}
          </div>
        </li>
      </ol>

      <p className="meta-line">
        <Icon name="calendar" size={16} /> Pickup {formatDate(request.pickup_date)}
      </p>
      {showLandmarks && request.notes && <p className="notes">“{request.notes}”</p>}
    </div>
  )
}
