import { useAuth } from '../auth/AuthProvider'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// Greeting + a row of counts at the top of each home page.
// stats: [{ label, value, tone? }] where tone is 'green' | 'brown' | undefined
export default function Welcome({ subtitle, action, stats }) {
  const { profile } = useAuth()
  const firstName = profile?.full_name?.split(/\s+/)[0] ?? ''
  return (
    <section className="welcome">
      <div className="welcome-head">
        <div>
          <h1>{greeting()}, {firstName}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {stats && (
        <dl className="stats">
          {stats.map((s) => (
            <div key={s.label} className={`stat ${s.tone ? `stat-${s.tone}` : ''}`}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
