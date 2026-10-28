# Step 8: Testing

## Automated database security tests
File: [supabase/tests/security.test.mjs](../supabase/tests/security.test.mjs). Run it with:
```bash
yarn test:db
```
It loads our **real** migration file into **PGlite** (a full Postgres that runs inside Node, no internet or Supabase needed), creates four test users (Ama and Esi as farmers, Kojo and Yaw as transporters), then tries **60 things**, both allowed and forbidden. Expected output ends with:
```
60 passed, 0 failed
```

What it checks (matches the design doc's "functional acceptance tests"):
| Design doc requirement | Tests |
|------------------------|-------|
| Farmer can post and later see a saved request | farmer creates request; other farmer can't see it |
| Driver can quote but can't alter another driver's quote | Yaw can't edit Kojo's offer; can't see it either |
| Only one active offer per driver per request | second live offer rejected; can re-offer after withdrawing |
| Farmer can accept only one offer, even with two attempts | second accept fails with "no longer open"; other offers DECLINED |
| Only the chosen driver can update pickup/delivery | farmer and Yaw are refused; can't skip steps |
| Farmer confirms; both see the same final status | both read CONFIRMED; 5 history events |
| Invalid dates/quantities/prices are refused | past date, zero quantity |
| Unauthorized transitions show errors | direct writes to `jobs`/`status` are "permission denied" |
| Privacy | transporter can't see farmer's phone until accepted; losing transporter never can |
| Signed-out visitors | see nothing |

**Real bug this caught:** the first version wouldn't let a transporter add a vehicle. The "who can see this vehicle" rule couldn't see the row being inserted. We fixed the policy and the test now passes. *(A good story for the presentation: tests found something we would have hit in the demo.)*

## Manual checklist (do this on the live site before the demo)
Use two browsers (or one normal + one private window): one as farmer, one as transporter.

- [ ] Sign up a farmer and a transporter; each lands on the right home page
- [ ] Farmer types `/transporter` in the URL → "not available for your account"
- [ ] Farmer: submit empty form → errors under each field; past date refused
- [ ] Farmer posts request → appears in "My requests" after refresh
- [ ] Transporter with no vehicle → "Add a vehicle first"
- [ ] Transporter adds vehicle, sees the load, sends offer → farmer sees it within 15 s
- [ ] Transporter edits price → farmer sees new price; withdraw → it disappears
- [ ] Farmer accepts → both see the job; phones now visible
- [ ] Driver: Picked up → Delivered; farmer: Confirm → both show Confirmed after refresh
- [ ] History lists every step with names and times
- [ ] Try it on a phone screen (Chrome devtools → phone size, or a real phone)
- [ ] Turn off Wi-Fi and try an action → "Network problem" message

## User testing (design doc section 8)
Give real farmers/transporters the link with **no instructions**. Write down: did they finish, where did they get stuck, what did you change afterwards. Track: requests posted, requests that got an offer, offers accepted, jobs completed. **Collect these numbers; don't promise them.**

## How to explain it
- "We didn't just click around. We wrote 60 automated tests that attack our own database: drivers editing each other's prices, double-accepting, skipping steps. All of them are blocked."
- "The tests run against the exact same SQL file we deploy, so what we test is what's live."
