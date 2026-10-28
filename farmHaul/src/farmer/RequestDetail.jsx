import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { unwrap, useData } from '../lib/useData'
import { formatDate, formatDateTime, formatGhs, one, whatsappLink } from '../lib/format'
import { Empty, ErrorBox, Loading, StatusBadge } from '../components/ui'
import Icon from '../components/Icon'
import RequestSummary from '../components/RequestSummary'

export default function RequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(null) // offer id, or 'cancel'
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  const { data, error, loading, reload } = useData(
    async () => {
      const [request, offers] = await Promise.all([
        supabase.from('requests').select('*, job:jobs!jobs_request_id_fkey(id, status)').eq('id', id).single().then(unwrap),
        supabase
          .from('offers')
          .select(`*,
            vehicle:vehicles!offers_vehicle_id_fkey(vehicle_type, capacity_amount, capacity_unit),
            transporter:profiles!offers_transporter_id_fkey(full_name, area)`)
          .eq('request_id', id)
          .order('price_ghs')
          .then(unwrap),
      ])
      return { request, offers }
    },
    [id],
    { poll: true }, // new offers appear without a manual refresh
  )

  if (loading) return <Loading />
  if (!data) return <ErrorBox error={error} onRetry={reload} />

  const { request, offers } = data
  const job = one(request.job)
  const activeOffers = offers.filter((o) => o.status === 'ACTIVE')

  async function accept(offerId) {
    setBusy(true)
    setActionError(null)
    // One database call does everything in a single transaction (see accept_offer in the SQL).
    const { data: jobId, error } = await supabase.rpc('accept_offer', { p_offer_id: offerId })
    setBusy(false)
    setConfirming(null)
    if (error) {
      setActionError(error)
      return reload()
    }
    navigate(`/jobs/${jobId}`)
  }

  async function cancel() {
    setBusy(true)
    setActionError(null)
    const { error } = await supabase.rpc('cancel_request', { p_request_id: id })
    setBusy(false)
    setConfirming(null)
    if (error) setActionError(error)
    reload()
  }

  return (
    <>
      <Link className="back-link" to="/farmer"><Icon name="back" size={16} /> My requests</Link>
      <div className="card">
        <div className="card-top">
          <StatusBadge status={request.status} />
          <span className="muted small">Posted {formatDateTime(request.created_at)}</span>
        </div>
        <RequestSummary request={request} showLandmarks />
        {job && (
          <Link className="btn btn-primary" to={`/jobs/${job.id}`}>View delivery progress</Link>
        )}
        {request.status === 'OPEN' && (
          <a
            className="btn btn-whatsapp share-btn"
            href={whatsappLink(
              `Transport needed: ${Number(request.quantity)} ${request.unit} of ${request.produce}, ` +
              `${request.pickup_area} to ${request.destination_area}, pickup ${formatDate(request.pickup_date)}. ` +
              `Send your price on FarmHaul: ${window.location.origin}/transporter/requests/${request.id}`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="chat" size={16} /> Share with transporters on WhatsApp
          </a>
        )}
        {request.status === 'CANCELLED' && request.cancel_reason && (
          <p className="muted">Reason: {request.cancel_reason}</p>
        )}
      </div>

      <ErrorBox error={error} onRetry={reload} />
      <ErrorBox error={actionError} />

      {request.status === 'OPEN' && (
        <>
          <h2>Offers ({activeOffers.length})</h2>
          {activeOffers.length === 0 && (
            <Empty title="No offers yet" icon="clock">
              <p className="muted">Transporters in the area can see your request. This page checks for new offers automatically.</p>
            </Empty>
          )}
          <ul className="card-list">
            {activeOffers.map((o) => (
              <li key={o.id} className="card offer-card">
                <div className="offer-head">
                  <div className="contact">
                    <span className="avatar" aria-hidden="true">{o.transporter?.full_name?.[0]}</span>
                    <div>
                      <p className="contact-name">{o.transporter?.full_name}</p>
                      <p className="muted small">{o.transporter?.area} · {formatDateTime(o.updated_at)}</p>
                    </div>
                  </div>
                  <span className="price">{formatGhs(o.price_ghs)}</span>
                </div>
                <p className="meta-line">
                  <Icon name="truck" size={16} />
                  {o.vehicle?.vehicle_type} · carries up to {Number(o.vehicle?.capacity_amount)} {o.vehicle?.capacity_unit}
                </p>
                {o.message && <p className="notes">“{o.message}”</p>}
                {confirming === o.id ? (
                  <div className="confirm">
                    <p>Accept {o.transporter?.full_name}’s offer of {formatGhs(o.price_ghs)}? Other offers will be declined.</p>
                    <div className="row">
                      <button className="btn btn-primary" disabled={busy} onClick={() => accept(o.id)}>
                        {busy ? 'Accepting…' : 'Yes, accept'}
                      </button>
                      <button className="btn" disabled={busy} onClick={() => setConfirming(null)}>Back</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-primary" disabled={busy} onClick={() => setConfirming(o.id)}>Accept offer</button>
                )}
              </li>
            ))}
          </ul>

          <div className="danger-zone">
            {confirming === 'cancel' ? (
              <div className="confirm">
                <p>Cancel this request? Transporters will no longer see it.</p>
                <div className="row">
                  <button className="btn btn-danger" disabled={busy} onClick={cancel}>Yes, cancel request</button>
                  <button className="btn" disabled={busy} onClick={() => setConfirming(null)}>Back</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-ghost" onClick={() => setConfirming('cancel')}>Cancel request</button>
            )}
          </div>
        </>
      )}
    </>
  )
}
