import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { PILOT_AREAS, UNITS } from '../lib/constants'
import { todayIso } from '../lib/format'
import { ErrorBox, Field } from '../components/ui'

export default function NewRequest() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    produce: '',
    quantity: '',
    unit: UNITS[0],
    pickup_area: profile.area,
    pickup_landmark: '',
    destination_area: PILOT_AREAS.find((a) => a !== profile.area) ?? PILOT_AREAS[0],
    destination_landmark: '',
    pickup_date: '',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // Friendly checks in the browser. The database checks the same rules again,
  // so nobody can skip them by calling the API directly.
  function validate() {
    const errs = {}
    if (!form.produce.trim()) errs.produce = 'What are you transporting?'
    if (!(Number(form.quantity) > 0)) errs.quantity = 'Enter an amount above 0'
    if (!form.pickup_landmark.trim()) errs.pickup_landmark = 'Add a landmark so the driver can find you'
    if (!form.destination_landmark.trim()) errs.destination_landmark = 'Add a landmark for the drop-off'
    if (!form.pickup_date) errs.pickup_date = 'Choose a pickup date'
    else if (form.pickup_date < todayIso()) errs.pickup_date = 'Pickup date cannot be in the past'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)
    setError(null)
    const { data, error } = await supabase
      .from('requests')
      .insert({
        ...form,
        produce: form.produce.trim(),
        quantity: Number(form.quantity),
        pickup_landmark: form.pickup_landmark.trim(),
        destination_landmark: form.destination_landmark.trim(),
        notes: form.notes.trim() || null,
      })
      .select('id')
      .single()
    setBusy(false)
    if (error) return setError(error)
    navigate(`/farmer/requests/${data.id}`)
  }

  return (
    <>
      <h1>New transport request</h1>
      <form onSubmit={onSubmit} className="form card" noValidate>
        <Field label="Produce" error={errors.produce}>
          <input value={form.produce} onChange={set('produce')} placeholder="e.g. Tomatoes" />
        </Field>
        <div className="row">
          <Field label="Amount" error={errors.quantity}>
            <input type="number" inputMode="decimal" min="0" step="any" value={form.quantity} onChange={set('quantity')} />
          </Field>
          <Field label="Unit">
            <select value={form.unit} onChange={set('unit')}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
        </div>

        <h2 className="form-section">Pickup</h2>
        <Field label="Area">
          <select value={form.pickup_area} onChange={set('pickup_area')}>
            {PILOT_AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Landmark" error={errors.pickup_landmark}>
          <input value={form.pickup_landmark} onChange={set('pickup_landmark')} placeholder="e.g. Behind the Methodist school" />
        </Field>

        <h2 className="form-section">Destination</h2>
        <Field label="Area">
          <select value={form.destination_area} onChange={set('destination_area')}>
            {PILOT_AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Landmark" error={errors.destination_landmark}>
          <input value={form.destination_landmark} onChange={set('destination_landmark')} placeholder="e.g. Main market, tomato section" />
        </Field>

        <Field label="Pickup date" error={errors.pickup_date}>
          <input type="date" min={todayIso()} value={form.pickup_date} onChange={set('pickup_date')} />
        </Field>
        <Field label="Notes (optional)">
          <textarea rows={3} maxLength={500} value={form.notes} onChange={set('notes')} placeholder="Anything the driver should know" />
        </Field>

        <ErrorBox error={error} />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Posting…' : 'Post request'}</button>
      </form>
    </>
  )
}
