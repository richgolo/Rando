# Step 3: Sign-up, sign-in and roles

## What we built
- A **sign-up** screen where users pick *Farmer* or *Transporter* and enter name, phone, area, email and password.
- A **sign-in** screen.
- Automatic redirect to the right home page for each role.
- **Page guards**, so a farmer who opens a transporter page (or the other way round) is taken to their own home page.

## How it works
1. **Sign-up** ([src/auth/SignUp.jsx](../src/auth/SignUp.jsx)) calls `supabase.auth.signUp(...)` and sends role, name, phone and area as extra *metadata*.
2. In the database, the `handle_new_user` **trigger** copies that metadata into a new `profiles` row. The app never writes the profile itself, so a user can't later change their own role: `role` isn't in the list of editable columns.
3. **AuthProvider** ([src/auth/AuthProvider.jsx](../src/auth/AuthProvider.jsx)) keeps track of the session (are you logged in?) and loads your profile (who you are). It also handles the moment right after sign-in when the session exists but the profile is still loading, so pages don't flash an error.
4. **RequireRole** ([src/auth/RequireRole.jsx](../src/auth/RequireRole.jsx)) wraps each page:
   - not signed in → sent to `/signin`, then back to the page they wanted
   - wrong role → sent to their own home page (this also covers signing out as a farmer and signing in as a transporter)
5. **Home** (in [src/App.jsx](../src/App.jsx)) sends farmers to `/farmer` and transporters to `/transporter`.

## Validation
- In the browser: name at least 2 letters, phone like `024 123 4567` or `+233 24 123 4567`, password at least 6 characters. Errors show under each field.
- In the database: the same name/phone rules as `check` constraints, so bad data can't get in through the API either.

## Email confirmation
Supabase can require users to click a link in an email before signing in. For a farm pilot this adds friction, so we recommend turning it **off** (Step 1). If it's on, the app shows a "Check your email" screen.

## How to explain it
- "When you sign up you choose a role. The database creates your profile automatically, and **your role can't be changed from the app**. That prevents a farmer turning themselves into a transporter to see other farmers' loads."
- "The page guards are for user experience only. The real lock is in the database. Even if you got to a transporter screen, the data behind it would come back empty."
- "Your phone number is collected at sign-up but only shown to the other person once an offer is accepted."

## Questions judges might ask
- **What about people without email?** It's a real concern from research question 5. Phone-number (SMS) sign-in is on the "if time remains" list; Supabase supports it, but it needs an SMS provider and costs money.
- **Where are passwords stored?** By Supabase Auth, hashed. Our tables never see them.
