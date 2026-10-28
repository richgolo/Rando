# Step 2: Database and security

File: [supabase/migrations/20261026000000_farmhaul_schema.sql](../supabase/migrations/20261026000000_farmhaul_schema.sql). It's split into six numbered sections; this doc follows the same order.

## What we built
Six tables, the rules about who may read or write each one, and three functions that are the **only** way to change a delivery's status.

## 1. The status list
```
OPEN → ASSIGNED → PICKED_UP → DELIVERED → CONFIRMED
  ↘ CANCELLED        ↘ CANCELLED (needs a reason)
```
- **OPEN:** posted, waiting for offers
- **ASSIGNED:** farmer accepted one offer; a job now exists
- **PICKED_UP / DELIVERED:** set by the driver
- **CONFIRMED:** set by the farmer ("I received it"). This is separate from DELIVERED because the driver *saying* it arrived is not the same as the farmer *confirming* it.

Offers have their own statuses: **ACTIVE, WITHDRAWN, ACCEPTED, DECLINED**.

## 2. The tables
| Table | One row is… | Important rules |
|-------|-------------|-----------------|
| `profiles` | a user: role (farmer/transporter), name, phone, area | One role per account (kept simple for the pilot) |
| `vehicles` | a transporter's vehicle: type, capacity + unit, plate | Capacity must be > 0 |
| `requests` | a farmer's load: produce, amount + unit, pickup/destination area + landmark, date, notes, status | Amount > 0; date can't be in the past |
| `offers` | a transporter's price for a request (GHS), vehicle, message | Price > 0; **one live offer per transporter per request** |
| `jobs` | the delivery created when an offer is accepted | **Exactly one job per request** (`unique`) |
| `status_events` | one line of history: who changed what, from → to, when | Written only by the database itself |

**Why the job doesn't store the transporter or price:** it points to the winning offer (`accepted_offer_id`), and the offer already has both. Storing them twice could let them disagree.

**Indexes** on `requests(status, pickup_date)`, `offers(request_id)` etc. keep the common lists fast as data grows.

**Constraints** (`check (quantity > 0)`, `unique`, foreign keys) mean bad data is refused by the database, even if someone skips the app and calls the API directly.

## 3–5. Row-level security (RLS): the heart of the security
With RLS turned on, a table returns **nothing** unless a *policy* says this user may see a row. We wrote one policy per rule:

| Who | Can see | Can change |
|-----|---------|-----------|
| Farmer | Own requests, offers on own requests, profiles + vehicles of transporters who offered | Create requests (as a farmer only) |
| Transporter | OPEN requests, requests they offered on, own offers, own vehicles | Own vehicles; own offers **only while ACTIVE and the request is OPEN**, status only to ACTIVE/WITHDRAWN |
| Both, after acceptance | The job, its history, and **each other's phone number** | Nothing directly. Only through the functions |
| Signed-out visitors | Nothing | Nothing |

On top of policies we use **column permissions** (`grant update (price_ghs, …)`): the app is simply not allowed to write `status` on requests or jobs at all, nor any column of `jobs` or `status_events`. That's why the three functions below exist.

**Privacy rule from the design doc:** a transporter cannot see the farmer's phone until the farmer accepts their offer. The `can_view_profile` helper function enforces this.

**Helper functions** (`is_request_farmer`, `has_offered_on`, …) are marked `security definer`. That lets a policy on one table look at another table without the rules calling each other in a loop.

**Triggers** (code that runs automatically):
- `handle_new_user`: when someone signs up, creates their profile from the sign-up form.
- `validate_new_request`: rejects a past pickup date. It's a trigger rather than a CHECK so that old requests stay valid after their date passes.
- `log_request_created`: writes the first history line ("Request posted").

## 6. The three state-change functions
| Function | Who may call it | What it does |
|----------|-----------------|--------------|
| `accept_offer(offer)` | The farmer who owns the request | Explained in [Step 6](06-accepting-an-offer.md) |
| `update_job_status(job, status)` | Driver: PICKED_UP, DELIVERED. Farmer: CONFIRMED | Checks the caller **and** that the move is legal (no skipping steps), saves the time, logs history |
| `cancel_request(request, reason)` | OPEN: farmer. ASSIGNED: farmer or driver, **reason required** | After pickup, cancelling isn't allowed in the app; use the support contact |

Each function checks **who is calling** (`auth.uid()`) itself. Hiding a button in the app is **not** security. The database refuses the action no matter how it's sent.

## How to explain it
- "All our rules live **in the database**, not in the React code. Even if someone opens developer tools and calls our API by hand, Postgres refuses what they're not allowed to do."
- "Row-level security means every query is automatically filtered to what *this user* may see. A transporter literally cannot download a farmer's phone number until they've been chosen."
- "Status can only move forward one step at a time, and only by the right person. The driver can't confirm their own delivery; only the farmer can."
- "Every status change writes a history row with who did it and when, so we can always explain what happened on a job."

## Questions judges might ask
- **What stops a driver changing another driver's price?** The update policy only matches rows where `transporter_id = auth.uid()`. Another driver's offer simply doesn't match, so 0 rows change. Tested in Step 8.
- **What stops a driver marking their own offer as accepted?** Two things: the policy only allows status ACTIVE or WITHDRAWN, and accepting goes through `accept_offer`, which checks the caller is the farmer.
- **Can a user be both farmer and transporter?** Not in this version (one role per account). The design doc left this open for research; it would mean changing `role` to a list.
- **Why are units a fixed list?** So amounts are comparable (a vehicle's capacity vs a load). The list (crates, bags, kg, tonnes) is a placeholder until research confirms what people actually use.
