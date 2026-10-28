import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'
import { PILOT_AREAS } from '../lib/constants'
import { ErrorBox, Field } from '../components/ui'
import AuthShell from './AuthShell'

const PHONE_RE = /^\+?[0-9 ]{9,16}$/

export default function SignUp() {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const [form, setForm] = useState({
    role: params.get('role') === 'transporter' ? 'transporter' : 'farmer', full_name: '', phone: '', area: PILOT_AREAS[0], email: '', password: '',
  })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  function validate() {
    const errs = {}
    if (form.full_name.trim().length < 2) errs.full_name = 'Enter your name'
    if (!PHONE_RE.test(form.phone.trim())) errs.phone = 'Enter a phone number, e.g. 024 123 4567'
    if (form.password.length < 6) errs.password = 'At least 6 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setBusy(true)
    setError(null)
    // The extra "data" fields are saved on the auth user; a database trigger
    // copies them into the profiles table (see the SQL migration, section 4).
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          role: form.role,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          area: form.area,
        },
      },
    })
    setBusy(false)
    if (error) return setError(error)
    // If email confirmation is switched on in Supabase, there is no session yet.
    if (!data.session) setCheckEmail(true)
  }

  if (checkEmail) {
    return (
      <AuthShell title="Check your email">
        <p>We sent a confirmation link to <strong>{form.email}</strong>. Open it, then sign in.</p>
        <Link className="btn btn-primary" to="/signin">Go to sign in</Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Create your account" subtitle="It takes less than a minute.">
      <form onSubmit={onSubmit} className="form" noValidate>
        <fieldset className="role-picker">
          <legend className="field-label">I am a…</legend>
          {[
            ['farmer', 'Farmer', 'I need produce moved'],
            ['transporter', 'Transporter', 'I have a vehicle'],
          ].map(([value, label, hint]) => (
            <label key={value} className={`role-option ${form.role === value ? 'selected' : ''}`}>
              <input type="radio" name="role" value={value} checked={form.role === value} onChange={set('role')} />
              <strong>{label}</strong>
              <span className="muted small">{hint}</span>
            </label>
          ))}
        </fieldset>
        <Field label="Full name" error={errors.full_name}>
          <input value={form.full_name} onChange={set('full_name')} autoComplete="name" />
        </Field>
        <Field label="Phone" error={errors.phone} hint="Only shown to the other person once an offer is accepted.">
          <input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="024 123 4567" />
        </Field>
        <Field label="Area">
          <select value={form.area} onChange={set('area')}>
            {PILOT_AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Email">
          <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
        </Field>
        <Field label="Password" error={errors.password}>
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        <ErrorBox error={error} />
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="auth-switch">Already have an account? <Link to="/signin">Sign in</Link></p>
    </AuthShell>
  )
}
