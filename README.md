# Squad Builder

A private mobile app (React Native + Expo, iOS & Android) for building FC-style
player cards, forming teams, claiming lineup positions, and scheduling fixtures
with your friends.

## Features

- **Player cards** — self-assigned PAC/SHO/PAS/DRI/DEF/PHY stats (goalkeepers get their own six), 13 positions,
  overall auto-calculated with position-weighted averages, and card tiers
  (Bronze < 65, Silver 65–74, Gold 75+) on an original diamond-shield card design.
- **Card photos** — put a picture from your photo library on your card, with a
  photo editor for framing it: drag a crop frame, rub the background away with
  a finger, and paint back anything taken by mistake. Remove Background has a
  first go automatically, which works against a plain wall or open sky and
  says so when a backdrop is too close in colour to the player's clothes to
  cut along. All of it runs on the device; nothing is sent anywhere but your
  own Supabase Storage bucket.
- **PlayStyles+** — 36 styles across 6 categories (Scoring, Passing,
  Ball Control, Defending, Physical, Goalkeeper), max 4 per player, shown as
  custom icon badges on the card.
- **Teams** — create a team (creator becomes captain) and invite friends with a
  6-character join code.
- **Lineups** — captains pick a 6v6 (2-2-1, 2-1-2, 3-1-1, 1-2-2), 7v7 (2-3-1,
  3-2-1, 3-1-2, 2-2-2), 8v8 (3-3-1, 3-2-2, 2-3-2, 2-4-1), 9v9 (3-3-2,
  3-2-3, 4-3-1, 3-4-1), 10v10 (4-3-2, 4-2-3, 3-4-2, 3-3-3, 4-4-1) or 11v11
  (4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 5-3-2, 3-4-3) formation; players claim open slots on a
  live pitch view (realtime via Supabase).
- **Accounts** — no passwords: sign up with a player name and email, and sign
  in with a one-time code emailed to you (typed on any device).
- **Photo cut-out** — "Remove Background" uses Google's MediaPipe selfie
  segmentation model (Apache 2.0), run in a hidden WebView on phones and in
  the page on the web. The engine (~9 MB) and model (~250 KB) download the
  first time and are cached after that; without a connection it falls back
  to a colour-based cut-out that works offline. Erase/Restore brushes touch
  up either result.
- **Chemistry** — +3 in-position, +1 adjacent, 0 out of position, plus a +1
  bonus for sharing a PlayStyle category with a teammate.
- **Fixtures** — captain-to-captain match proposals with accept/decline, a
  calendar view, post-match score and player stat entry (goals/assists/MOTM),
  and career records (apps, goals, assists, W-D-L).

## Stack

- [Expo](https://expo.dev) (React Native, TypeScript, expo-router)
- [Supabase](https://supabase.com) (auth, Postgres, realtime, storage)

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run every file in `supabase/migrations/` in order,
   `0001_init.sql` first (or `supabase db push` with the Supabase CLI). They are
   cumulative — skipping one leaves features broken.
   `0007_player_photos.sql` also creates the `player-photos` Storage bucket. If
   your project refuses to create policies on `storage.objects` from the SQL
   editor, create the four policies by hand under **Storage → Policies** using
   the same conditions as the file.
3. **Email.** Players sign in with a one-time code emailed to them (there
   are no passwords), so email has to work:
   - Connect your own email service under **Authentication → Emails → SMTP
     Settings** (a Gmail account with an app password works: host
     `smtp.gmail.com`, port `587`). Supabase's built-in sender only reaches
     members of your Supabase team, sends a few emails an hour, and does not
     let you edit the templates.
   - Paste `supabase/email-templates/magic-link.html` into **Authentication →
     Emails → Magic Link** and `supabase/email-templates/confirm-signup.html`
     into **Confirm signup** (source/HTML view), and save. These put the code
     in the email; the default templates only carry a link.
4. The email also carries a link that signs the player in on the device that
   asked. Tell Supabase where the app lives under **Authentication → URL
   Configuration**:
   - **Site URL**: `http://localhost:8081` (the Expo web address while
     developing; your real web address once it is hosted).
   - **Redirect URLs**: add `http://localhost:8081/**`, `exp://**` (Expo Go)
     and `squadbuilder://**` (an installed build).

### 2. App

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm start              # then press i / a, or scan the QR with Expo Go
```

### 3. PlayStyle icons

`assets/playstyles/` contains the custom icon set (one PNG per style,
kebab-case filenames — see `assets/playstyles/README.md`). Lookups go through
the `ICON_IMAGES` dict in `src/constants/playstyleIcons.ts`; to swap an icon,
overwrite the file and keep the filename.

## Project layout

```
app/                    expo-router screens
  (auth)/               sign in / sign up
  (tabs)/
    index.tsx           My Card — card builder + career record
    teams/              team list, team detail, lineup pitch
    fixtures/           calendar, scheduling, match detail + results
src/
  components/           PlayerCard, PitchView, PlaystylePicker, ...
  constants/            positions, playstyles, formations, icon registry
  logic/                overall/tier calculation, chemistry, photo cut-out
  lib/supabase.ts       Supabase client
  lib/photo.ts          photo picking, decoding and encoding
  lib/png.ts            PNG encoder (the pipeline needs alpha out of raw pixels)
supabase/migrations/    database schema + RLS policies
```

## Roadmap

- Push notifications (Expo Notifications) for match proposals and slot claims
- Team crests via Supabase Storage
- Nicer date/time picker for scheduling

## Troubleshooting

**Never run `npm audit fix --force` in this project.** Expo pins an exact,
mutually compatible set of package versions for its SDK. `--force` ignores
that and "fixes" advisories by changing major versions — it will happily
downgrade `expo` from 57 to 46 and leave the app unable to start with
errors like `Cannot find module 'expo/config-plugins'`.

The advisories it reports come from build-time tooling, not from anything
that ships in the app, so they are not worth breaking the toolchain over.

To recover if it has already run:

```bash
git checkout -- package.json package-lock.json
rm -rf node_modules          # Windows: rmdir /s /q node_modules
npm install
npx expo start --clear
```

To upgrade the SDK deliberately, bump `expo` and then align every other
package with that SDK's bundled versions, rather than letting npm pick.
