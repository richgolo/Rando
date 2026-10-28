import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { unwrap, useData } from '../lib/useData'
import { STATUS_LABELS, SUPPORT_CONTACT } from '../lib/constants'
import { formatDateTime, formatGhs } from '../lib/format'
import { ErrorBox, Field, Loading, StatusBadge } from '../components/ui'
import Icon from '../components/Icon'
import RequestSummary from '../components/RequestSummary'

const STEPS = ['ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CONFIRMED']

// What each role is allowed to do next. The database enforces the same rules
// in update_job_status(); this just decides which button to show.
const NEXT_ACTION = {
  transporter: { ASSIGNED: ['PICKED_UP', 'Mark as picked up'], PICKED_UP: ['DELIVERED', 'Mark as delivered'] },
  farmer: { DELIVERED: ['CONFIRMED', 'Confirm I received it'] },
}

// One screen for both farmer and transporter.
export default function JobDetail() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [showCancel, setShowCancel] = useState(false)
  const [reason, setReason] = useState('')

  const { data, error, loading, reload } = useData(
    async () => {
      const job = await supabase
        .from('jobs')
        .select(`*,
          request:requests!jobs_request_id_fkey(*, farmer:profiles!requests_farmer_id_fkey(full_name, phone)),
          offer:offers!jobs_accepted_offer_id_fkey(price_ghs, message,
            vehicle:vehicles!offers_vehicle_id_fkey(vehicle_type, plate_or_label, capacity_amount, capacity_unit),
            transporter:profiles!offers_transporter_id_fkey(full_name, phone))`)
        .eq('id', id)
        .single()
        .then(unwrap)
      const events = await supabase
        .from('status_events')
        .select('*, actor:profiles!status_events_actor_id_fkey(full_name, role)')
        .eq('request_id', job.request_id)
        .order('created_at')
        .then(unwrap)
      return { job, events }
    },
    [id],
    { poll: true }, // the other person's updates show up automatically
  )

  if (loading) return <Loading />
  if (!data) {
    return (
      <>
        <Link className="back-link" to="/"><Icon name="back" size={16} /> Home</Link>
        <ErrorBox error={error} onRetry={reload} />
      </>
    )
  }

  const { job, events } = data
  const { request, offer } = job
  const isFarmer = profile.role === 'farmer'
  const other = isFarmer ? offer.transporter : request.farmer
  const next = NEXT_ACTION[profile.role][job.status]
  const stepIndex = STEPS.indexOf(job.status)

  async function advance(to) {
    setBusy(true)
    setActionError(null)
    const { error } = await supabase.rpc('update_job_status', { p_job_id: job.id, p_to: to })
    setBusy(false)
    if (error) setActionError(error)
    reload()
  }

  async function cancelJob(e) {
    e.preventDefault()
    if (reason.trim().length < 5) return setActionError('Please give a reason (at least 5 characters).')
    setBusy(true)
    setActionError(null)
    const { error } = await supabase.rpc('cancel_request', { p_request_id: request.id, p_reason: reason.trim() })
    setBusy(false)
    if (error) return setActionError(error)
    setShowCancel(false)
    reload()
  }

  return (
    <>
      <Link className="back-link" to={isFarmer ? `/farmer/requests/${request.id}` : '/transporter/jobs'}>
        <Icon name="back" size={16} /> Back
      </Link>
      <div className="page-head">
        <h1>Delivery job</h1>
        <StatusBadge status={job.status} />
      </div>

      {job.status !== 'CANCELLED' && (
        <ol className="progress" aria-label="Delivery progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i < stepIndex ? 'done' : i === stepIndex ? 'done current' : ''}>
              <span className="step-dot">{i <= stepIndex ? <Icon name="check" size={14} /> : i + 1}</span>
              <span className="step-label">{STATUS_LABELS[s]}</span>
            </li>
          ))}
        </ol>
      )}

      <ErrorBox error={actionError} />
      <ErrorBox error={error} onRetry={reload} />

      {next && (
        <button className="btn btn-primary btn-block" disabled={busy} onClick={() => advance(next[0])}>
          {busy ? 'Saving…' : next[1]}
        </button>
      )}
      {isFarmer && job.status === 'DELIVERED' && (
        <p className="muted small">The driver says it has arrived. Confirm once you or your buyer has received it.</p>
      )}

      <div className="card deal-card">
        <div className="contact">
          <span className="avatar avatar-lg" aria-hidden="true">{other?.full_name?.[0]}</span>
          <div className="contact-info">
            <p className="eyebrow">{isFarmer ? 'Your transporter' : 'The farmer'}</p>
            <p className="contact-name">{other?.full_name}</p>
            {other?.phone && <p className="muted">{other.phone}</p>}
          </div>
          {other?.phone && (
            <a className="btn btn-primary" href={`tel:${other.phone.replace(/\s/g, '')}`}>
              <Icon name="phone" size={16} /> Call
            </a>
          )}
        </div>
        <div className="price-row">
          <div>
            <span className="muted">Agreed price</span>
            <p className="muted small">Paid directly to the transporter, not through the app.</p>
          </div>
          <span className="price price-lg">{formatGhs(offer.price_ghs)}</span>
        </div>
        {isFarmer && (
          <p className="meta-line">
            <Icon name="truck" size={16} />
            {offer.vehicle.vehicle_type} · {offer.vehicle.plate_or_label} · up to {Number(offer.vehicle.capacity_amount)} {offer.vehicle.capacity_unit}
          </p>
        )}
      </div>

      <div className="card">
        <p className="eyebrow">The load</p>
        <RequestSummary request={request} showLandmarks />
      </div>

      <details className="card history">
        <summary>
          <span>History</span>
          <span className="muted small">{events.length} {events.length === 1 ? 'update' : 'updates'}</span>
          <Icon name="chevron" size={18} className="history-chevron" />
        </summary>
        <ol className="timeline">
          {events.map((e) => (
            <li key={e.id}>
              <strong>{STATUS_LABELS[e.to_status]}</strong>
              <div className="muted small">
                {e.actor?.full_name ?? 'someone'} ({e.actor?.role}) · {formatDateTime(e.created_at)}
              </div>
              {e.note && <div className="muted small">{e.note}</div>}
            </li>
          ))}
        </ol>
      </details>

      <div className="card">
        <h2>Problem with this job?</h2>
        <p className="muted">
          Call the other person first. If that doesn’t solve it, contact {SUPPORT_CONTACT.name}:{' '}
          <a href={`tel:${SUPPORT_CONTACT.phone.replace(/\s/g, '')}`}>{SUPPORT_CONTACT.phone}</a>
        </p>
        {job.status === 'ASSIGNED' && (
          showCancel ? (
            <form onSubmit={cancelJob} className="form">
              <Field label="Why are you cancelling?" hint="The other person will see this reason.">
                <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <div className="row">
                <button className="btn btn-danger" disabled={busy}>Cancel job</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCancel(false)}>Back</button>
              </div>
            </form>
          ) : (
            <button className="btn btn-ghost" onClick={() => setShowCancel(true)}>Cancel this job…</button>
          )
        )}
      </div>
    </>
  )
}
