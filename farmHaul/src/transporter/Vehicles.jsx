import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { unwrap, useData } from '../lib/useData'
import { UNITS, VEHICLE_TYPES } from '../lib/constants'
import { Empty, ErrorBox, Field, Loading } from '../components/ui'
import Icon from '../components/Icon'

const EMPTY = { vehicle_type: VEHICLE_TYPES[0], capacity_amount: '', capacity_unit: UNITS[0], plate_or_label: '' }

export default function Vehicles() {
  const { user } = useAuth()
  const [editing, setEditing] = useState(null) // null = closed, 'new', or a vehicle object
  const { data, error, loading, reload } = useData(
    async () =>
      unwrap(await supabase.from('vehicles').select('*').eq('transporter_id', user.id).order('created_at')),
    [],
  )

  async function toggleActive(v) {
    await supabase.from('vehicles').update({ active: !v.active }).eq('id', v.id)
    reload()
  }

  if (loading) return <Loading />

  return (
    <>
      <div className="page-head">
        <h1>My vehicles</h1>
        {!editing && <button className="btn btn-primary" onClick={() => setEditing('new')}>+ Add vehicle</button>}
      </div>
      <ErrorBox error={error} onRetry={reload} />

      {editing && (
        <VehicleForm
          key={editing === 'new' ? 'new' : editing.id}
          vehicle={editing === 'new' ? null : editing}
          onDone={() => {
            setEditing(null)
            reload()
          }}
        />
      )}

      {data?.length === 0 && !editing && (
        <Empty title="No vehicles yet" icon="truck">
          <p className="muted">Add the vehicle you use so you can send offers.</p>
        </Empty>
      )}

      <ul className="card-list">
        {data?.map((v) => (
          <li key={v.id} className={`card vehicle-card ${v.active ? '' : 'faded'}`}>
            <span className="vehicle-icon"><Icon name="truck" size={22} /></span>
            <div className="row-main">
              <p className="row-title">{v.vehicle_type}</p>
              <p className="row-sub">{v.plate_or_label}</p>
              <div className="vehicle-tags">
                <span className="pill">Up to {Number(v.capacity_amount)} {v.capacity_unit}</span>
                {!v.active && <span className="pill">Not used for new offers</span>}
              </div>
            </div>
            <div className="vehicle-actions">
              <button className="btn btn-small" onClick={() => setEditing(v)}>Edit</button>
              <button className="btn btn-small btn-ghost" onClick={() => toggleActive(v)}>
                {v.active ? 'Stop using' : 'Use again'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function VehicleForm({ vehicle, onDone }) {
  const [form, setForm] = useState(
    vehicle
      ? { ...vehicle, capacity_amount: String(vehicle.capacity_amount) }
      : EMPTY,
  )
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!(Number(form.capacity_amount) > 0)) errs.capacity_amount = 'Enter a capacity above 0'
    if (!form.plate_or_label.trim()) errs.plate_or_label = 'Enter a number plate or a name for this vehicle'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setBusy(true)
    setError(null)
    const values = {
      vehicle_type: form.vehicle_type,
      capacity_amount: Number(form.capacity_amount),
      capacity_unit: form.capacity_unit,
      plate_or_label: form.plate_or_label.trim(),
    }
    const { error } = vehicle
      ? await supabase.from('vehicles').update(values).eq('id', vehicle.id)
      : await supabase.from('vehicles').insert(values)
    setBusy(false)
    if (error) return setError(error)
    onDone()
  }

  return (
    <form className="form card" onSubmit={submit} noValidate>
      <h2>{vehicle ? 'Edit vehicle' : 'Add vehicle'}</h2>
      <Field label="Type">
        <select value={form.vehicle_type} onChange={set('vehicle_type')}>
          {VEHICLE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <div className="row">
        <Field label="Capacity" error={errors.capacity_amount}>
          <input type="number" inputMode="decimal" min="0" step="any" value={form.capacity_amount} onChange={set('capacity_amount')} />
        </Field>
        <Field label="Unit">
          <select value={form.capacity_unit} onChange={set('capacity_unit')}>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Number plate or label" error={errors.plate_or_label}>
        <input value={form.plate_or_label} onChange={set('plate_or_label')} placeholder="e.g. GT-1234-20" />
      </Field>
      <ErrorBox error={error} />
      <div className="row">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save vehicle'}</button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>Cancel</button>
      </div>
    </form>
  )
}
