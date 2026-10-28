# Step 7: Job tracking (picked up → delivered → confirmed)

## What we built
One screen, `/jobs/:id` ([src/shared/JobDetail.jsx](../src/shared/JobDetail.jsx)), used by **both** the farmer and the driver. The design doc suggested a single shared component, so there's one place to fix bugs.

It shows:
- a **progress bar**: Assigned → Picked up → Delivered → Confirmed
- **one big action button**, depending on who you are and the current status:

| Status | Driver sees | Farmer sees |
|--------|-------------|-------------|
| ASSIGNED | **Mark as picked up** | (waiting) |
| PICKED_UP | **Mark as delivered** | (waiting) |
| DELIVERED | (waiting) | **Confirm I received it** |
| CONFIRMED | done | done |

- the load, route and **agreed price** (with a note that payment is made directly, not in the app)
- **the other person's name and phone**, which is only visible now that they're matched. The farmer also sees the vehicle and number plate.
- **History**: every status change with who did it and when, e.g. *"Picked up, by Kojo (transporter), 30 Oct 07:42"*
- **Problem with this job?**: the support contact, plus **Cancel this job…** while ASSIGNED, which requires a reason the other person will see

The page re-checks every 15 seconds, so when Kojo marks "picked up", Ama sees it without refreshing.

## How it's enforced
Buttons call `update_job_status(job, new_status)`. The database checks:
- **who:** only the assigned driver can set PICKED_UP/DELIVERED; only the farmer can set CONFIRMED
- **order:** only one step forward (can't jump from ASSIGNED to DELIVERED, can't go backwards)
- then it saves the timestamp (`picked_up_at`, etc.), updates the request's status to match, and writes a history row

Cancelling (`cancel_request`): OPEN → farmer only. ASSIGNED → farmer or driver, **reason required**. After pickup → not allowed in the app; they call support. This is a simple rule for the pilot, and the design doc says research should decide the exact rule.

## How to explain it
- "**Delivered** means the driver says it arrived. **Confirmed** means the farmer agrees. We kept these separate on purpose, so a driver can't close a job on their own."
- "Every change is logged with who and when. If there's a dispute, the history shows exactly what happened."
- "We don't do GPS tracking, payments or WhatsApp yet. We say that openly; those are on the roadmap, not faked."

## Questions judges might ask
- **What if the driver never marks delivered?** The farmer can see it's stuck at Picked up and call the driver (phone is shown) or support. Automatic reminders are a future improvement.
- **What if the farmer never confirms?** The job stays DELIVERED. For the pilot we'd follow up manually; an auto-confirm after X days is a possible rule once research shows what's fair.
- **Why can't you cancel after pickup in the app?** The produce is already on the truck, so it's a real-world problem that needs a person to sort out, not a button.
