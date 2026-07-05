# Squad Builder

A private mobile app (React Native + Expo, iOS & Android) for building FC-style
player cards, forming teams, claiming lineup positions, and scheduling fixtures
with your friends.

## Features

- **Player cards** — self-assigned PAC/SHO/PAS/DRI/DEF/PHY stats, 12 positions,
  overall auto-calculated with position-weighted averages, and card tiers
  (Bronze < 65, Silver 65–74, Gold 75+) on an original diamond-shield card design.
- **PlayStyles+** — 36 styles across 6 categories (Scoring, Passing,
  Ball Control, Defending, Physical, Goalkeeper), max 4 per player, shown as
  custom icon badges on the card.
- **Teams** — create a team (creator becomes captain) and invite friends with a
  6-character join code.
- **Lineups** — captains pick 6v6 (2-2-1, 2-1-2, 3-1-1, 1-2-2) or 10v10
  (4-3-2, 4-2-3, 3-4-2, 3-3-3, 4-4-1) formations; players claim open slots on a
  live pitch view (realtime via Supabase).
- **Chemistry** — +3 in-position, +1 adjacent, 0 out of position, plus a +1
  bonus for sharing a PlayStyle category with a teammate.
- **Fixtures** — captain-to-captain match proposals with accept/decline, a
  calendar view, post-match score and player stat entry (goals/assists/MOTM),
  and career records (apps, goals, assists, W-D-L).

## Stack

- [Expo](https://expo.dev) (React Native, TypeScript, expo-router)
- [Supabase](https://supabase.com) (auth, Postgres, realtime)

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/migrations/0001_init.sql`
   (or `supabase db push` with the Supabase CLI).
3. For a private friends-only app you may want to disable public signups or
   enable email confirmation under **Authentication → Providers**.

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
  logic/                overall/tier calculation, chemistry
  lib/supabase.ts       Supabase client
supabase/migrations/    database schema + RLS policies
```

## Roadmap

- Push notifications (Expo Notifications) for match proposals and slot claims
- Team crests / avatars via Supabase Storage
- Nicer date/time picker for scheduling
