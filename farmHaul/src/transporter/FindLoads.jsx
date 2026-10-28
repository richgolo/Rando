import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { unwrap, useData } from '../lib/useData'
import { PILOT_AREAS } from '../lib/constants'
import { formatGhs, one } from '../lib/format'
import { Empty, ErrorBox, Loading } from '../components/ui'
import RequestRow from '../components/RequestRow'
import Welcome from '../components/Welcome'

const FINISHED = ['CONFIRMED', 'CANCELLED']

export default function FindLoads() {
  const { user, profile } = useAuth()
  const [area, setArea] = useState(profile.area)

  const { data, error, loading, reload } = useData(
    async () => {
      // Only the columns a transporter needs to decide. The farmer's phone
      // isn't in this table at all, and their profile is hidden by RLS.
      let query = supabase
        .from('requests')
        .select('id, produce, quantity, unit, pickup_area, destination_area, pickup_date, created_at')
        .eq('status', 'OPEN')
        .order('pickup_date')
      if (area !== 'all') query = query.eq('pickup_area', area)

      const [requests, myOffers] = await Promise.all([
        query.then(unwrap),
        supabase
          .from('offers')
          .select('request_id, price_ghs, status, job:jobs!jobs_accepted_offer_id_fkey(status)')
          .eq('transporter_id', user.id)
          .then(unwrap),
      ])
      const offered = Object.fromEntries(
        myOffers.filter((o) => o.status === 'ACTIVE').map((o) => [o.request_id, o.price_ghs]),
      )
      const activeJobs = myOffers.filter((o) => one(o.job) && !FINISHED.includes(one(o.job).status)).length
      const waiting = myOffers.filter((o) => o.status === 'ACTIVE').length
      return { requests, offered, activeJobs, waiting }
    },
    [area],
    { poll: true },
  )

  const areaName = area === 'all' ? 'all areas' : area

  return (
    <>
      <Welcome
        subtitle="Find loads near you and send your price."
        stats={data && [
          { label: area === 'all' ? 'Open loads' : `Open loads in ${area}`, value: data.requests.length },
          { label: 'Offers waiting', value: data.waiting, tone: 'brown' },
          { label: 'Active jobs', value: data.activeJobs, tone: 'green' },
        ]}
      />

      <div className="list-head">
        <h2>Open loads</h2>
        <label className="inline-select">
          <span className="sr-only">Pickup area</span>
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="all">All areas</option>
            {PILOT_AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
      </div>

      <ErrorBox error={error} onRetry={reload} />
      {loading && <Loading />}
      {data?.requests.length === 0 && (
        <Empty title={`No open loads in ${areaName} right now`} icon="search">
          <p className="muted">This list updates automatically when farmers post new loads.</p>
          {area !== 'all' && (
            <button className="btn btn-soft" onClick={() => setArea('all')}>Show all areas</button>
          )}
        </Empty>
      )}
      <ul className="card-list">
        {data?.requests.map((r) => (
          <li key={r.id}>
            <RequestRow
              request={r}
              to={`/transporter/requests/${r.id}`}
              side={data.offered[r.id] != null
                ? <span className="pill pill-strong">You offered {formatGhs(data.offered[r.id])}</span>
                : <span className="pill">New</span>}
            />
          </li>
        ))}
      </ul>
    </>
  )
}
