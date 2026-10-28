// Database security tests for FarmHaul.
// Runs the real migration inside PGlite (Postgres in Node) with stand-ins for
// Supabase auth, then checks every rule from the design doc.
// Run with:  yarn test:db

import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../migrations/20261026000000_farmhaul_schema.sql', import.meta.url), 'utf8')
const db = new PGlite()

// Minimal stand-ins for what Supabase provides
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`)
await db.exec(migration)

const U = {
  ama: '00000000-0000-0000-0000-00000000000a',
  esi: '00000000-0000-0000-0000-00000000000e',
  kojo: '00000000-0000-0000-0000-00000000000c',
  yaw: '00000000-0000-0000-0000-00000000000d',
}
const meta = (role, name) => JSON.stringify({ role, full_name: name, phone: '024 123 4567', area: 'Techiman' })
await db.query(`insert into auth.users values ($1,$2),($3,$4),($5,$6),($7,$8)`, [
  U.ama, meta('farmer', 'Ama'), U.esi, meta('farmer', 'Esi'),
  U.kojo, meta('transporter', 'Kojo'), U.yaw, meta('transporter', 'Yaw'),
])

let pass = 0, fail = 0
async function as(uid, sql, params = []) {
  await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`)
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ''])
  try { return await db.query(sql, params) } finally { await db.exec('reset role') }
}
async function ok(name, fn, check = () => true) {
  try {
    const r = await fn()
    if (check(r)) { pass++; console.log('  ok   ', name) }
    else { fail++; console.log('  FAIL ', name, JSON.stringify(r.rows)) }
    return r
  } catch (e) { fail++; console.log('  FAIL ', name, '->', e.message) }
}
async function rejects(name, fn, re) {
  try {
    const r = await fn()
    // An update blocked by RLS affects 0 rows rather than throwing
    if (r.affectedRows === 0 && !re) { pass++; console.log('  ok   ', name, '(0 rows)'); return }
    fail++; console.log('  FAIL ', name, 'did not fail', JSON.stringify(r.rows), r.affectedRows)
  } catch (e) {
    if (!re || re.test(e.message)) { pass++; console.log('  ok   ', name, '->', e.message) }
    else { fail++; console.log('  FAIL ', name, 'wrong error ->', e.message) }
  }
}
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
const newReq = (uid) => as(uid, `insert into requests (produce, quantity, unit, pickup_area, pickup_landmark, destination_area, destination_landmark, pickup_date)
  values ('Tomatoes', 20, 'crates', 'Techiman', 'Near the clinic', 'Kumasi', 'Kejetia market', $1) returning id`, [tomorrow])

console.log('Sign-up')
await ok('profiles created by trigger', () => db.query('select count(*)::int n from profiles'), r => r.rows[0].n === 4)

console.log('Requests')
const req = await ok('farmer creates request', () => newReq(U.ama), r => r.rows.length === 1)
const reqId = req.rows[0].id
await ok('"Request posted" event logged', () => db.query('select * from status_events where request_id=$1', [reqId]), r => r.rows.length === 1)
await rejects('transporter cannot create request', () => newReq(U.kojo), /row-level security/)
await rejects('past pickup date rejected', () => as(U.ama, `insert into requests (produce, quantity, unit, pickup_area, pickup_landmark, destination_area, destination_landmark, pickup_date)
  values ('Yam', 5, 'bags', 'a', 'b', 'c', 'd', '2020-01-01')`), /past/)
await rejects('zero quantity rejected', () => as(U.ama, `insert into requests (produce, quantity, unit, pickup_area, pickup_landmark, destination_area, destination_landmark, pickup_date)
  values ('Yam', 0, 'bags', 'a', 'b', 'c', 'd', $1)`, [tomorrow]), /check constraint/)
await rejects('farmer cannot set status directly', () => as(U.ama, `update requests set status='CONFIRMED' where id=$1`, [reqId]), /permission denied/)
await ok('other farmer cannot see request', () => as(U.esi, 'select * from requests'), r => r.rows.length === 0)
await ok('transporter sees open request', () => as(U.kojo, 'select * from requests'), r => r.rows.length === 1)
await ok('transporter cannot see farmer profile/phone yet', () => as(U.kojo, 'select * from profiles where id=$1', [U.ama]), r => r.rows.length === 0)
await ok('signed-out visitor sees nothing', () => as(null, 'select * from requests').catch(e => ({ rows: [], e })), r => r.rows.length === 0)

console.log('Vehicles')
const kv = await ok('transporter adds vehicle', () => as(U.kojo, `insert into vehicles (vehicle_type, capacity_amount, capacity_unit, plate_or_label) values ('Pickup truck', 40, 'crates', 'GT-1234-20') returning id`))
const yv = await ok('second transporter adds vehicle', () => as(U.yaw, `insert into vehicles (vehicle_type, capacity_amount, capacity_unit, plate_or_label) values ('Kia truck', 60, 'crates', 'AS-555-21') returning id`))
await rejects('farmer cannot add vehicle', () => as(U.ama, `insert into vehicles (vehicle_type, capacity_amount, capacity_unit, plate_or_label) values ('x', 1, 'bags', 'y')`), /row-level security/)
const kVeh = kv.rows[0].id, yVeh = yv.rows[0].id

console.log('Offers')
const ko = await ok('Kojo makes offer', () => as(U.kojo, `insert into offers (request_id, vehicle_id, price_ghs, message) values ($1,$2,450,'Can come Friday morning') returning id`, [reqId, kVeh]))
await rejects('Kojo cannot make a second live offer', () => as(U.kojo, `insert into offers (request_id, vehicle_id, price_ghs) values ($1,$2,400)`, [reqId, kVeh]), /duplicate key/)
await rejects('Kojo cannot offer with Yaw\'s vehicle', () => as(U.kojo, `insert into offers (request_id, vehicle_id, price_ghs) values ($1,$2,400)`, [reqId, yVeh]), /row-level security/)
const yo = await ok('Yaw makes offer', () => as(U.yaw, `insert into offers (request_id, vehicle_id, price_ghs) values ($1,$2,500) returning id`, [reqId, yVeh]))
const kOffer = ko.rows[0].id, yOffer = yo.rows[0].id
await rejects('Yaw cannot edit Kojo\'s offer', () => as(U.yaw, `update offers set price_ghs=1 where id=$1`, [kOffer]))
await rejects('Yaw cannot mark own offer ACCEPTED', () => as(U.yaw, `update offers set status='ACCEPTED' where id=$1`, [yOffer]), /row-level security/)
await ok('Kojo edits own price', () => as(U.kojo, `update offers set price_ghs=420 where id=$1 returning price_ghs`, [kOffer]), r => Number(r.rows[0].price_ghs) === 420)
await ok('Yaw cannot see Kojo\'s offer', () => as(U.yaw, 'select * from offers'), r => r.rows.length === 1)
await ok('Ama sees both offers', () => as(U.ama, 'select * from offers'), r => r.rows.length === 2)
await ok('Ama sees offering transporters\' profiles', () => as(U.ama, 'select * from profiles'), r => r.rows.length === 3)
await ok('Ama sees offered vehicles', () => as(U.ama, 'select * from vehicles'), r => r.rows.length === 2)

console.log('Accepting')
await rejects('transporter cannot accept', () => as(U.kojo, 'select accept_offer($1)', [kOffer]), /Only the farmer/)
await rejects('other farmer cannot accept', () => as(U.esi, 'select accept_offer($1)', [kOffer]), /Only the farmer/)
await rejects('cannot insert job directly', () => as(U.ama, 'insert into jobs (request_id, accepted_offer_id) values ($1,$2)', [reqId, kOffer]), /permission denied/)
const acc = await ok('Ama accepts Kojo', () => as(U.ama, 'select accept_offer($1) as job_id', [kOffer]))
const jobId = acc.rows[0].job_id
await rejects('second accept fails cleanly', () => as(U.ama, 'select accept_offer($1)', [yOffer]), /no longer open/)
await ok('Yaw\'s offer declined', () => db.query('select status from offers where id=$1', [yOffer]), r => r.rows[0].status === 'DECLINED')
await ok('request ASSIGNED', () => db.query('select status from requests where id=$1', [reqId]), r => r.rows[0].status === 'ASSIGNED')
await rejects('Kojo cannot edit offer after acceptance', () => as(U.kojo, `update offers set price_ghs=1 where id=$1`, [kOffer]))
await ok('Kojo now sees Ama\'s profile/phone', () => as(U.kojo, 'select phone from profiles where id=$1', [U.ama]), r => r.rows.length === 1)
await ok('Yaw still cannot see Ama\'s profile', () => as(U.yaw, 'select * from profiles where id=$1', [U.ama]), r => r.rows.length === 0)
await ok('Kojo sees job', () => as(U.kojo, 'select * from jobs'), r => r.rows.length === 1)
await ok('Yaw does not see job', () => as(U.yaw, 'select * from jobs'), r => r.rows.length === 0)
await ok('Kojo still sees the (now assigned) request', () => as(U.kojo, 'select * from requests where id=$1', [reqId]), r => r.rows.length === 1)
await ok('Yaw (who offered) can still see the request he lost', () => as(U.yaw, 'select status from requests where id=$1', [reqId]), r => r.rows.length === 1)

console.log('Job progress')
await rejects('farmer cannot mark picked up', () => as(U.ama, `select update_job_status($1,'PICKED_UP')`, [jobId]), /Only the assigned transporter/)
await rejects('Yaw cannot mark picked up', () => as(U.yaw, `select update_job_status($1,'PICKED_UP')`, [jobId]), /Only the assigned transporter/)
await rejects('cannot skip to delivered', () => as(U.kojo, `select update_job_status($1,'DELIVERED')`, [jobId]), /Cannot mark delivered/)
await rejects('cannot update jobs table directly', () => as(U.kojo, `update jobs set status='CONFIRMED' where id=$1`, [jobId]), /permission denied/)
await ok('Kojo marks picked up', () => as(U.kojo, `select update_job_status($1,'PICKED_UP')`, [jobId]))
await rejects('cannot cancel after pickup', () => as(U.ama, `select cancel_request($1,'changed my mind')`, [reqId]), /cannot be cancelled/)
await ok('Kojo marks delivered', () => as(U.kojo, `select update_job_status($1,'DELIVERED')`, [jobId]))
await rejects('transporter cannot confirm', () => as(U.kojo, `select update_job_status($1,'CONFIRMED')`, [jobId]), /Only the farmer/)
await ok('Ama confirms', () => as(U.ama, `select update_job_status($1,'CONFIRMED')`, [jobId]))
await ok('both see CONFIRMED', async () => ({ rows: [(await as(U.ama, 'select status from jobs')).rows[0], (await as(U.kojo, 'select status from jobs')).rows[0]] }), r => r.rows.every(x => x.status === 'CONFIRMED'))
await ok('5 history events visible to Kojo', () => as(U.kojo, 'select * from status_events where request_id=$1', [reqId]), r => r.rows.length === 5)
await ok('Yaw sees no history', () => as(U.yaw, 'select * from status_events'), r => r.rows.length === 0)

console.log('Cancelling')
const r2 = (await newReq(U.ama)).rows[0].id
await rejects('transporter cannot cancel open request', () => as(U.kojo, 'select cancel_request($1)', [r2]), /Only the farmer/)
await ok('farmer cancels open request', () => as(U.ama, 'select cancel_request($1)', [r2]))
await rejects('cannot offer on cancelled request', () => as(U.kojo, `insert into offers (request_id, vehicle_id, price_ghs) values ($1,$2,400)`, [r2, kVeh]), /row-level security/)
const r3 = (await newReq(U.ama)).rows[0].id
const o3 = (await as(U.kojo, `insert into offers (request_id, vehicle_id, price_ghs) values ($1,$2,300) returning id`, [r3, kVeh])).rows[0].id
await ok('Kojo withdraws offer', () => as(U.kojo, `update offers set status='WITHDRAWN' where id=$1 returning status`, [o3]), r => r.rows[0]?.status === 'WITHDRAWN')
await rejects('cannot accept withdrawn offer', () => as(U.ama, 'select accept_offer($1)', [o3]), /no longer available/)
const o3b = (await ok('Kojo can offer again after withdrawing', () => as(U.kojo, `insert into offers (request_id, vehicle_id, price_ghs) values ($1,$2,310) returning id`, [r3, kVeh]))).rows[0].id
await as(U.ama, 'select accept_offer($1)', [o3b])
await rejects('assigned cancel needs a reason', () => as(U.kojo, 'select cancel_request($1)', [r3]), /reason/)
await ok('transporter cancels assigned job with reason', () => as(U.kojo, `select cancel_request($1,'Truck broke down')`, [r3]))
await ok('job is CANCELLED', () => db.query('select j.status from jobs j where request_id=$1', [r3]), r => r.rows[0].status === 'CANCELLED')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
