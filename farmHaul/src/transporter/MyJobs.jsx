import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { unwrap, useData } from '../lib/useData'
import { formatGhs, one } from '../lib/format'
import { Empty, ErrorBox, Loading, OfferBadge, StatusBadge } from '../components/ui'
import RequestRow from '../components/RequestRow'

const FINISHED = ['CONFIRMED', 'CANCELLED']

export default function MyJobs() {
  const { user } = useAuth()
  const { data, error, loading, reload } = useData(
    async () =>
      unwrap(
        await supabase
          .from('offers')
          .select(`*,
            request:requests!offers_request_id_fkey(id, produce, quantity, unit, pickup_area, destination_area, pickup_date, status),
            job:jobs!jobs_accepted_offer_id_fkey(id, status)`)
          .eq('transporter_id', user.id)
          .order('created_at', { ascending: false }),
      ),
    [],
    { poll: true },
  )

  if (loading) return <Loading />
  const offers = data ?? []
  const jobs = offers.filter((o) => one(o.job))
  const activeJobs = jobs.filter((o) => !FINISHED.includes(one(o.job).status))
  const pastJobs = jobs.filter((o) => FINISHED.includes(one(o.job).status))
  const waiting = offers.filter((o) => o.status === 'ACTIVE')
  const other = offers.filter((o) => o.status === 'DECLINED')

  return (
    <>
      <h1>My offers & jobs</h1>
      <ErrorBox error={error} onRetry={reload} />
      {offers.length === 0 && (
        <Empty title="Nothing here yet" icon="briefcase">
          <p className="muted">Find an open load and send an offer.</p>
          <Link className="btn btn-primary" to="/transporter">Find loads</Link>
        </Empty>
      )}

      <Section title="Active jobs" items={activeJobs} render={(o) => (
        <RequestRow request={o.request} to={`/jobs/${one(o.job).id}`} side={<Side badge={<StatusBadge status={one(o.job).status} />} price={o.price_ghs} />} />
      )} />
      <Section title="Waiting for the farmer" items={waiting} render={(o) => (
        <RequestRow request={o.request} to={`/transporter/requests/${o.request_id}`} side={<Side badge={<OfferBadge status={o.status} />} price={o.price_ghs} />} />
      )} />
      <Section title="Past jobs" quiet items={pastJobs} render={(o) => (
        <RequestRow request={o.request} to={`/jobs/${one(o.job).id}`} side={<Side badge={<StatusBadge status={one(o.job).status} />} price={o.price_ghs} />} />
      )} />
      <Section title="Not chosen" quiet items={other} render={(o) => (
        <RequestRow request={o.request} faded side={<Side badge={<OfferBadge status={o.status} />} price={o.price_ghs} />} />
      )} />
    </>
  )
}

// Price on top, status underneath, on the right of each row
function Side({ badge, price }) {
  return (
    <span className="side-stack">
      <span className="price">{formatGhs(price)}</span>
      {badge}
    </span>
  )
}

function Section({ title, items, render, quiet = false }) {
  if (items.length === 0) return null
  return (
    <section className={quiet ? 'section-quiet' : undefined}>
      <h2>{title} ({items.length})</h2>
      <ul className="card-list">
        {items.map((o) => <li key={o.id}>{render(o)}</li>)}
      </ul>
    </section>
  )
}
