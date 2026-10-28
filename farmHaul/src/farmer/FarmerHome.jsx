import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { unwrap, useData } from '../lib/useData'
import { Empty, ErrorBox, Loading, StatusBadge } from '../components/ui'
import RequestRow from '../components/RequestRow'
import Welcome from '../components/Welcome'

const FINISHED = ['CONFIRMED', 'CANCELLED']
const ON_THE_WAY = ['ASSIGNED', 'PICKED_UP', 'DELIVERED']

export default function FarmerHome() {
  // Row-level security means this only ever returns the signed-in farmer's own requests.
  const { data, error, loading, reload } = useData(
    async () =>
      unwrap(
        await supabase
          .from('requests')
          .select('*, offers!offers_request_id_fkey(status)')
          .order('created_at', { ascending: false }),
      ),
    [],
    { poll: true },
  )

  if (loading) return <Loading />
  const requests = data ?? []
  const active = requests.filter((r) => !FINISHED.includes(r.status))
  const finished = requests.filter((r) => FINISHED.includes(r.status))
  const count = (statuses) => requests.filter((r) => statuses.includes(r.status)).length

  const row = (r) => {
    const activeOffers = r.offers.filter((o) => o.status === 'ACTIVE').length
    const side =
      r.status === 'OPEN' ? (
        <span className={activeOffers ? 'pill pill-strong' : 'pill'}>
          {activeOffers ? `${activeOffers} ${activeOffers === 1 ? 'offer' : 'offers'}` : 'No offers yet'}
        </span>
      ) : (
        <StatusBadge status={r.status} />
      )
    return (
      <li key={r.id}>
        <RequestRow request={r} to={`/farmer/requests/${r.id}`} side={side} />
      </li>
    )
  }

  return (
    <>
      <Welcome
        subtitle="Post a load and compare prices from transporters near you."
        action={<Link className="btn btn-primary" to="/farmer/new">+ New request</Link>}
        stats={[
          { label: 'Waiting for offers', value: count(['OPEN']) },
          { label: 'On the way', value: count(ON_THE_WAY), tone: 'brown' },
          { label: 'Delivered', value: count(['CONFIRMED']), tone: 'green' },
        ]}
      />
      <ErrorBox error={error} onRetry={reload} />

      {requests.length === 0 && (
        <Empty title="No transport requests yet">
          <p className="muted">Post your first load and transporters in your area can send you offers.</p>
          <Link className="btn btn-primary" to="/farmer/new">Post a request</Link>
        </Empty>
      )}

      {requests.length > 0 && (
        <section>
          <h2>Active ({active.length})</h2>
          {active.length === 0
            ? <p className="muted section-empty">Nothing in progress. Post a new request when you have a load ready.</p>
            : <ul className="card-list">{active.map(row)}</ul>}
        </section>
      )}

      {finished.length > 0 && (
        <section className="section-quiet">
          <h2>Completed ({finished.length})</h2>
          <ul className="card-list">{finished.map(row)}</ul>
        </section>
      )}
    </>
  )
}
