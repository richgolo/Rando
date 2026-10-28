# Step 6: Accepting an offer (the atomic transaction)

This is the most technical part of the project. Judges scoring "technical understanding" will likely ask about it.

## The problem
Accepting an offer changes **four things**:
1. the request → ASSIGNED
2. the chosen offer → ACCEPTED
3. every other offer → DECLINED
4. a new job is created (+ a history line)

If these happened as separate steps from the browser, things could go wrong:
- the phone loses signal halfway → request ASSIGNED but no job exists
- the farmer double-taps "Accept", or taps two different offers quickly → **two jobs, two drivers turn up**
- someone calls the API directly and skips a step

## The solution: one database function, one transaction
`accept_offer(p_offer_id)` in the SQL file (section 6). The app calls it with **one line**:
```js
const { data: jobId, error } = await supabase.rpc('accept_offer', { p_offer_id: offerId })
```
Inside the function:
1. **Who are you?** Must be signed in.
2. **Lock the request row** (`select … for update`). If a second accept arrives at the same moment, it **waits** here until the first finishes.
3. **Checks:** caller owns the request, request is still OPEN, offer belongs to it and is still ACTIVE (not withdrawn).
4. Make all four changes plus the history line.
5. Return the new job's id.

All of it happens in **one transaction**: either every change is saved, or none is. When the second accept finally gets the lock, it sees the request is ASSIGNED and fails with *"This request is no longer open"*. That's the "second acceptance must fail cleanly" requirement from the design doc.

We also made sure nobody can go around it: the app has **no permission** to insert into `jobs` or change a request's `status` directly.

## In the app
[src/farmer/RequestDetail.jsx](../src/farmer/RequestDetail.jsx): **Accept offer** → confirm box ("Other offers will be declined") → **Yes, accept** → button disabled while saving → on success, go to the job page. On error, show the message and reload the offers.

## How to explain it (try this on a whiteboard)
> "Imagine Ama taps Accept on Kojo's offer, and at the same moment taps Accept on Yaw's. Both requests reach the database. The first one locks the request, assigns Kojo, declines Yaw and creates the job, all at once. The second one was waiting for the lock. When it gets in, it sees the request is no longer open and stops with a clear error. So there can never be two drivers for one load."

Also mention that the database backs this up a second time: `jobs.request_id` is **unique**, so even a bug can't create two jobs for one request.

## Questions judges might ask
- **Why not do this in React?** The browser can't be trusted. It can be modified, lose connection or send duplicates. The database is the only place that sees every request in order.
- **What's a transaction?** A group of changes that succeed or fail together. There is never a half-finished state.
- **What does `security definer` mean?** The function runs with the database owner's permissions, so it can write to `jobs`, which normal users can't. That's why it checks `auth.uid()` itself before doing anything.
- **How did you test the race?** The automated tests (Step 8) check that a second accept fails. On the live site, you can also open the request in two browser tabs and accept different offers.
