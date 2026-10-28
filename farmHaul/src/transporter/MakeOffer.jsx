import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { unwrap, useData } from '../lib/useData'
import { formatGhs, one } from '../lib/format'
import { Empty, ErrorBox, Field, Loading, OfferBadge, StatusBadge } from '../components/ui'
import Icon from '../components/Icon'
import RequestSummary from '../components/RequestSummary'

export default function MakeOffer() {
  const { id } = useParams()
  const { user } = useAuth()

  const { data, error, loading, reload } = useData(
    async () => {
      const [request, offers, vehicles] = await Promise.all([
        supabase.from('requests').select('*').eq('id', id).single().then(unwrap),
        supabase
          .from('offers')
          .select('*, job:jobs!jobs_accepted_offer_id_fkey(id)')
          .eq('request_id', id)
          .eq('transporter_id', user.id)
          .order('created_at', { ascending: false })
          .then(unwrap),
        supabase.from('vehicles').select('*').eq('transporter_id', user.id).eq('active', true).then(unwrap),
      ])
      return { request, offers, vehicles }
    },
    [id],
  )

  if (loading) return <Loading />
  if (!data) {
    return (
      <>
        <Link className="back-link" to="/transporter"><Icon name="back" size={16} /> Open loads</Link>
        <ErrorBox error="This request is not available. It may have been taken by another transporter or cancelled." />
      </>
    )
  }

  const { request, offers, vehicles } = data
  const live = offers.find((o) => o.status === 'ACTIVE' || o.status === 'ACCEPTED')
  const latest = offers[0]

  return (
    <>
      <Link className="back-link" to="/transporter"><Icon name="back" size={16} /> Open loads</Link>
      <div className="card">
        <div className="card-top"><StatusBadge status={request.status} /></div>
        <RequestSummary request={request} showLandmarks />
        <p className="muted small">The farmer’s phone number is shared once they accept your offer.</p>
      </div>
      <ErrorBox error={error} onRetry={reload} />

      {live?.status === 'ACCEPTED' && one(live.job) && (
        <div className="card highlight">
          <p><strong>Your offer of {formatGhs(live.price_ghs)} was accepted.</strong></p>
          <Link className="btn btn-primary" to={`/jobs/${one(live.job).id}`}>Open the job</Link>
        </div>
      )}

      {!live && latest && request.status !== 'OPEN' && (
        <div className="card">
          <p>Your offer: {formatGhs(latest.price_ghs)} <OfferBadge status={latest.status} /></p>
        </div>
      )}

      {request.status === 'OPEN' && (
        vehicles.length === 0 ? (
          <Empty title="Add a vehicle first" icon="truck">
            <p className="muted">Farmers need to know what you drive and how much it carries.</p>
            <Link className="btn btn-primary" to="/transporter/vehicles">Add vehicle</Link>
          </Empty>
        ) : (
          <OfferForm
            key={live?.id ?? 'new'}
            request={request}
            vehicles={vehicles}
            existing={live?.status === 'ACTIVE' ? live : null}
            onSaved={reload}
          />
        )
      )}
    </>
  )
}

function OfferForm({ request, vehicles, existing, onSaved }) {
  const [form, setForm] = useState({
    price_ghs: existing ? String(existing.price_ghs) : '',
    vehicle_id: existing?.vehicle_id ?? vehicles[0].id,
    message: existing?.message ?? '',
  })
  const [fieldError, setFieldError] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = (k) => (e) => {
    setSaved(false)
    setForm({ ...form, [k]: e.target.value })
  }
  const vehicle = vehicles.find((v) => v.id === form.vehicle_id)
  const tooSmall =
    vehicle && vehicle.capacity_unit === request.unit && Number(vehicle.capacity_amount) < Number(request.quantity)

  async function submit(e) {
    e.preventDefault()
    const price = Number(form.price_ghs)
    if (!(price > 0)) return setFieldError('Enter a price above 0')
    setFieldError(null)
    setBusy(true)
    setError(null)
    const values = { price_ghs: price, vehicle_id: form.vehicle_id, message: form.message.trim() || null }
    const { error } = existing
      ? await supabase.from('offers').update(values).eq('id', existing.id).select('id').single()
      : await supabase.from('offers').insert({ ...values, request_id: request.id }).select('id').single()
    setBusy(false)
    if (error) return setError(error)
    setSaved(true)
    onSaved()
  }

  async function withdraw() {
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('offers').update({ status: 'WITHDRAWN' }).eq('id', existing.id).select('id').single()
    setBusy(false)
    if (error) return setError(error)
    onSaved()
  }

  return (
    <form className="form card" onSubmit={submit} noValidate>
      <h2>{existing ? 'Your offer' : 'Make an offer'}</h2>
      {existing && <p><OfferBadge status="ACTIVE" /> You can change or withdraw it until the farmer chooses.</p>}
      <Field label="Your price (GHS)" error={fieldError}>
        <input type="number" inputMode="decimal" min="0" step="0.01" value={form.price_ghs} onChange={set('price_ghs')} />
      </Field>
      <Field label="Vehicle" hint={tooSmall ? `Heads up: this vehicle carries ${Number(vehicle.capacity_amount)} ${vehicle.capacity_unit}, the load is ${Number(request.quantity)}.` : null}>
        <select value={form.vehicle_id} onChange={set('vehicle_id')}>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicle_type} ({v.plate_or_label}) · {Number(v.capacity_amount)} {v.capacity_unit}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Message to farmer (optional)">
        <textarea rows={2} maxLength={500} value={form.message} onChange={set('message')} placeholder="e.g. I can come early Friday morning" />
      </Field>
      <ErrorBox error={error} />
      {saved && <p className="success" role="status">Offer saved. The farmer can see it now.</p>}
      <div className="row">
        <button className="btn btn-primary" disabled={busy}>{existing ? 'Update offer' : 'Send offer'}</button>
        {existing && <button type="button" className="btn btn-ghost" disabled={busy} onClick={withdraw}>Withdraw</button>}
      </div>
    </form>
  )
}
