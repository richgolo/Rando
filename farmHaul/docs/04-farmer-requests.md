# Step 4: Farmer: posting and managing requests

## What we built
| Screen | URL | File |
|--------|-----|------|
| My requests | `/farmer` | [src/farmer/FarmerHome.jsx](../src/farmer/FarmerHome.jsx) |
| New request | `/farmer/new` | [src/farmer/NewRequest.jsx](../src/farmer/NewRequest.jsx) |
| Request detail + offers | `/farmer/requests/:id` | [src/farmer/RequestDetail.jsx](../src/farmer/RequestDetail.jsx) |

## The new-request form
Fields, as in the design doc: **produce, amount + unit, pickup area + landmark, destination area + landmark, pickup date, notes**.
- Areas are a dropdown (pilot areas from `constants.js`). Pickup area defaults to the farmer's own area.
- **Landmarks instead of a map pin.** The design doc says no mandatory map pin: rural addresses are usually described by landmarks ("behind the Methodist school").
- **No separate contact phone field.** The farmer's profile phone is used and only revealed after acceptance.

**Validation happens twice:**
1. In the browser, for friendly messages under each field: amount must be above 0, landmarks required, date not in the past.
2. In the database: the `check` constraints and the past-date trigger. So even a hand-made API call can't create a bad request.

When saved, the farmer goes straight to the request's detail page.

## My requests list
- Shows each request's status badge and, while OPEN, **how many active offers** it has.
- Row-level security means the query `select * from requests` automatically returns only *this* farmer's requests. The code doesn't need a "where farmer = me" filter, and couldn't get other farmers' data even if it tried.
- **Empty state:** "No transport requests yet" with a button to post one.
- **Re-checks every 15 seconds**, so new offers appear without refreshing.

## Request detail
- Full load and route, including landmarks and notes.
- While **OPEN**: the list of offers, cheapest first, each with price, transporter name and area, vehicle type and capacity, and message.
- **Accept offer** asks for confirmation first ("Other offers will be declined"). Then it calls `accept_offer` (see [Step 6](06-accepting-an-offer.md)).
- **Cancel request** (only while OPEN), also with confirmation.
- Once accepted: a **View delivery progress** button goes to the job.
- **No offers yet** empty state that says the page checks automatically.

## How to explain it
- "The form matches how farmers described their loads to us: what, how much, from where to where, and which day. No GPS needed."
- "We check the inputs twice: in the browser to help the user, and in the database so the data is always clean."
- "The farmer never has to refresh. New offers appear on their own every 15 seconds."

## Questions judges might ask
- **Why polling instead of real-time?** It's simpler and more reliable on weak mobile data, and the design doc says sockets are unnecessary for the MVP. A 15-second delay is fine for a delivery booked for a future day.
- **Can a farmer edit a request after posting?** Not in this version. They can cancel and re-post while it's OPEN. Editing would mean deciding what happens to offers already made on the old details.
