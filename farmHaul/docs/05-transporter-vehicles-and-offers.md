# Step 5: Transporter: vehicles and offers

## What we built
| Screen | URL | File |
|--------|-----|------|
| Find loads | `/transporter` | [src/transporter/FindLoads.jsx](../src/transporter/FindLoads.jsx) |
| Request + offer form | `/transporter/requests/:id` | [src/transporter/MakeOffer.jsx](../src/transporter/MakeOffer.jsx) |
| My offers & jobs | `/transporter/jobs` | [src/transporter/MyJobs.jsx](../src/transporter/MyJobs.jsx) |
| My vehicles | `/transporter/vehicles` | [src/transporter/Vehicles.jsx](../src/transporter/Vehicles.jsx) |

## Vehicles
- Add a vehicle with **type, capacity + unit, number plate or label**.
- Edit it, or mark it **"Stop using"** (inactive) instead of deleting it. Old offers still point to that vehicle, so deleting would break their history.
- A transporter with no vehicle sees "Add a vehicle first" instead of the offer form.

## Find loads
- Lists **OPEN** requests, soonest pickup first, filtered by pickup area (defaults to the transporter's own area; "All areas" is available).
- Shows enough to decide (produce, amount, route, date) but **not the farmer's name or phone**. The database query doesn't even ask for them, and RLS would refuse.
- Requests they've already offered on are marked "You offered GHS …".
- Updates every 15 seconds; has an empty state.

## Making an offer
- Price in **GHS**, which vehicle, and an optional message.
- **Capacity warning:** if the vehicle's unit matches the load's unit and it's too small, a hint warns the transporter. It's a warning, not a block, because they might do two trips.
- **Edit or withdraw** while the request is still OPEN. After withdrawing, they can make a fresh offer.
- What the database enforces (not just the app):
  - only transporters can offer, only on OPEN requests, only with **their own active** vehicle
  - **one live offer per transporter per request** (a unique index). Trying twice gives "You already have an active offer on this request."
  - once the farmer accepts *anyone*, the offer can't be edited any more

## My offers & jobs
Groups everything the transporter has done:
- **Active jobs**: accepted, in progress → opens the job screen
- **Waiting for the farmer**: active offers
- **Past jobs**: confirmed or cancelled
- **Not chosen**: declined offers

## How to explain it
- "A transporter sees the load and the route, enough to price it, but not the farmer's phone. That only appears once the farmer picks them. We built that from what farmers told us about trusting unknown drivers." *(Adjust to what your interviews actually found.)*
- "One transporter, one live offer per request. The database enforces this with a unique index, so it can't be bypassed."
- "Vehicles are never deleted, only switched off, so the history of past jobs stays correct."

## Questions judges might ask
- **Can a driver see other drivers' prices?** No. RLS only shows a transporter their own offers. Only the farmer sees all offers on their request.
- **What if a driver changes their price after the farmer starts comparing?** The farmer's page refreshes every 15 seconds and shows the latest price and the time it was updated. Once the farmer accepts, prices are locked.
- **Why let drivers quote instead of a fixed price?** That's how the design doc describes current negotiation. Research question 2 checks whether farmers actually prefer this.
