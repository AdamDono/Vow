# 💍 Vow — Build Progress & Next-Up Roadmap

> Living tracker for **Vow — The Relationship Operating System**.  
> Last updated: **November 23, 2026**

---

## ✅ Completed Milestones

### Milestone 1: Vision, Architecture & Dual-Mode Foundation
- Dual-mode React Native (Expo Router) + Hono TypeScript API + Neon PostgreSQL (Drizzle ORM) architecture.
- Full 13-table relational schema (`users`, `profiles`, `userPhotos`, `userInterests`, `swipes`, `matches`, `conversations`, `messages`, `relationshipInvites`, `relationships`, `dailyCheckins`, `sharedGoals`, `timelineMilestones`).
- **BIP Post #1:** Ready / Published.

### Milestone 2: Editorial Design System
- Warm Alabaster canvas (`#FFFBF9`), Deep Obsidian typography (`#1A1A2E`), Rose Crimson primary (`#E8475E`), and Soft Lavender Couples accent (`#C9A0F4` / `#F0E6FF`).
- **BIP Post #2:** Ready / Published.

### Milestone 3: Identity, Onboarding & Cloud Media Pipeline
- Email/password auth + real Google OAuth via Neon Auth + JWT session issuance.
- 6-step onboarding flow (`Basics`, `Photos`, `Bio`, `Goals`, `Interests`, `Location`).
- UploadThing CDN image uploads (`POST /api/upload`) with Cloudinary/local fallback.
- Live Profile screen + full Profile Editor persisting directly to Neon PostgreSQL.
- **BIP Post #3:** Ready / Published.

### Milestone 4: Intentional Chat Suite & Date Proposal Engine
- Live Single Mode messaging (`GET/POST /api/chat/:conversationId/messages`), icebreakers, and conversations list.
- Structured **Date Proposal Cards** (curated activities, venue, quick times, 1-tap accept).
- Camera roll photo attachments via UploadThing + fullscreen lightbox.
- In-chat Partner Profile Inspector + Unmatch / Block safety menu.
- **BIP Post #4:** Ready / Published.

### Milestone 5: Discovery Filter Engine & Vow Trust Score
- Multi-dimensional Discovery filters on Neon Postgres (`minAge`, `maxAge`, `city`, `lookingFor`, `verifiedOnly`).
- 1-tap **Reset Deck & Review** (`POST /api/singles/reset-swipes`).
- Full Discovery Profile Inspector with photo pagination.
- 4-Pillar Vow Trust Score modal + real-time Profile Strength completeness meter + photo reordering (`Make Main`).
- **BIP Post #5:** Ready / Published.

### Milestone 6: The Vow Commitment Lock, Couples Mode OS & UI Polish *(Just Completed!)*
- **End-to-End Vow Proposal Lifecycle (`backend/src/routes/proposals.ts`, `proposal.tsx`, `matches.tsx`, `chat/[id].tsx`):**
  - `GET /api/proposals` (incoming & outgoing pending invites), `POST /api/proposals/send` (self/coupled/duplicate/reverse guards), `POST /api/proposals/decline` (decline or withdraw), and `POST /api/proposals/accept` (Commitment Lock).
  - Accepting a Vow atomically locks both users to `coupled`, removes both from the Singles discovery feed, archives other single matches, creates the active relationship, creates a private `couple` conversation, and logs `"Our Vow Day"` on the timeline.
  - Live incoming Vow cards/banners in Chat & Matches, animated Commitment Lock transition overlay, and automatic sender transition into Couples Mode.
  - Smart app entry routing (`mobile/src/app/index.tsx`) auto-routes signed-in users into Single Mode or Couples Mode.
- **Full 5-Tab Couples Mode OS (`backend/src/routes/couples.ts`, `mobile/src/app/(couple)/`):**
  - **Dashboard:** Real partner/self names & avatars, `VOW COMMITTED` badge, Days Together counter, Relationship Pulse Harmony Score ring, Memories & Shared Vows stats, and double-blind check-in status/unlock card.
  - **Double-Blind Daily Check-In:** Idempotent daily upsert (`POST /api/couples/checkin`), stays sealed until both submit, then reveals both reflections simultaneously and updates Harmony Score.
  - **Private Vow Channel (`(couple)/chat.tsx`):** Couple-only messaging with UploadThing photo sharing, fullscreen lightbox, and participant authorization on `chat.ts`.
  - **Our Story (`(couple)/timeline.tsx`):** Segmented **Memory Vault** (add photo-backed milestones via `POST /api/couples/timeline`) + **Shared Vows** checklist (add/complete/delete via `GET/POST/PATCH/DELETE /api/couples/goals`).
  - **Couple Settings & Respectful Re-Entry (`(couple)/settings.tsx`):** Active Vow summary + wired **End Relationship on Vow** modal with 1–5 anonymous Mutual Respect Rating (`POST /api/couples/end`, `GET /api/couples/history`) returning both partners cleanly to Single Mode.
- **UI & UX Polish Pass:**
  - Unified all primary CTA buttons, onboarding progress bars, and outgoing chat bubbles to solid **`#E8475E`** (removed button gradients across 22 files).
  - Upgraded app-wide typography from Plus Jakarta Sans to **DM Sans** (`@expo-google-fonts/dm-sans`) with explicit font weights (`400`/`500`/`600`/`700`) and relaxed heading tracking for mobile readability.
  - Removed all `✨` icons and replaced them with crisp `Ionicons` / contextual icons; made Shared Vow delete trash icon red (`#DC2626` on `#FEF2F2`).
  - Fixed **"Use my current location"** on onboarding (`location.tsx`) to work on Web (browser geolocation + reverse geocoding + IP city fallback) as well as iOS/Android.
  - Seeded Neon Postgres demo accounts (`adam@vow.app`, `sarah@vow.app`, `elena@vow.app`, `marcus@vow.app`, `sofia@vow.app` — password `password123`).
- **BIP Post #6:** **Published** (5 live Couples Mode screenshots).

### Milestone 7: Real-Time WebSockets, 60fps Swipe Physics & Beta Security Hardening *(Just Completed!)*
- **Real-Time WebSocket Hub (`backend/src/ws/hub.ts`, `mobile/src/lib/ws.ts`):**
  - Attached authenticated `ws` server on `/ws?token=<JWT>` alongside the Hono REST API.
  - Instant live push events for Single & Couple chat messages (`chat:message`), stateful Date Proposal status updates (`chat:message_updated`), live typing indicators (`chat:typing`), new matches (`single:match`), Vow Proposal send/decline/accept (`proposal:received`, `proposal:updated`, `proposal:accepted`), double-blind check-in unlocks (`couple:checkin`), and relationship end (`couple:ended`).
- **60fps Drag-to-Swipe Card Physics (`mobile/src/app/(single)/discover.tsx` + `GestureHandlerRootView`):**
  - Smooth pan gesture drag with rotation interpolation, spring snap-back, velocity fling dismissal, floating **`LIKE ♥`** / **`PASS`** stamps, next-card peek scale-up, and animated button triggers.
- **Native Session Persistence & Security Hardening:**
  - Persists JWT tokens in iOS Keychain / Android Keystore via `expo-secure-store` (with web `localStorage` fallback) and hydrates on startup in `mobile/src/app/index.tsx`.
  - Persisted **Discovery Visibility** (`profiles.discovery_active`) in Neon PostgreSQL and enforced in `GET /api/singles/feed`.
  - Added `user_blocks` and `user_reports` tables + `POST /api/singles/block` (permanently hides blocked users, deactivates matches, records safety reports, adjusts `vouchRating`, and displays real Trust Score & live report counts on Profile).
  - Stateful Date Proposal cards (`POST /api/chat/:conversationId/date-proposal/:messageId/respond`) update in-place to **`Date Confirmed! 🎉`** or **`Declined`** across both clients in real time.
  - Guarded dev-only `neon-sync` fallback behind `NODE_ENV !== 'production'` and removed web browser focus rings on tab icons.
- **BIP Post #7:** Ready to Publish.

### Milestone 8: Facial Liveness Verification & Verified Platform History *(Just Completed!)*
- **Guided Facial Liveness Verification (`mobile/src/app/verify.tsx`, `POST /api/auth/verify-liveness`):**
  - 3-step live camera check (*Center face → Turn slightly right → Smile & Capture*) supporting Web live webcam (`getUserMedia` + canvas frame capture), native iOS/Android front camera (`expo-camera`), and selfie upload fallback.
  - Uploads private verification frame to UploadThing, updates `profiles.liveness_verified`, `verified_at`, `verification_photo_url`, boosts Vow Trust Score, and displays the green **`Face Verified`** shield across Profile, Discover Inspector, and In-Chat Inspector.
- **Verified Vow Platform History ("Dating Resume") (`backend/src/lib/history.ts`, `profile/index.tsx`, `discover.tsx`, `chat/[id].tsx`):**
  - Computes anonymized relationship track record (`completedRelationships`, `longestCommitmentDays`, `avgHarmonyScore`, `badgeLabel`) from `relationships`.
  - Live **`Show Dating Resume on Profile`** privacy toggle (`profiles.dating_resume_public`) persisted to Neon Postgres.
  - Surfaced on My Profile, Discover Profile Inspector, and In-Chat Profile Inspector.
- **BIP Post #8:** Ready to Publish.

### Milestone 9: Live Nearby Date Night Spots & Couple Planner *(Just Completed!)*
- **Free Real-World Restaurant & Date Spot Discovery (`GET /api/couples/date-spots`):**
  - Powered by **OpenStreetMap Overpass API + Nominatim** (100% free, zero API keys or Stripe required) with 10-minute caching and curated Cape Town / Johannesburg / Durban fallbacks.
  - Supports live GPS detection, city presets, and category filters (`All`, `Dining`, `Coffee`, `Wine & Bars`, `Outdoors`).
- **1-Tap Date Night Planner (`POST /api/couples/date-spots/plan`, `mobile/src/app/date-spots.tsx`):**
  - Accessible directly from **Couples Dashboard → Date Night Spots**.
  - Opens real venue locations in Google Maps and lets couples schedule a date night that automatically saves into **Shared Vows** AND drops a live real-time message into their **Private Vow Channel** over WebSockets.
- **BIP Post #9:** Ready to Publish.

---

## 🚀 What to Build Next (Prioritized Roadmap)

### Milestone 10: Push Notifications, Production Cloud Deploy & Beta Launch *(Recommended Next)*
1. **Push Notifications (Expo Notifications):** Instant alerts for new matches, messages, incoming Vow proposals, and 8:00 PM double-blind check-in reminders.
2. **Backend Hosting:** Deploy Hono + WebSocket API to Railway / Render / Fly.io with production env vars (`JWT_SECRET`, `DATABASE_URL`, `UPLOADTHING_TOKEN`).
3. **EAS Builds & TestFlight / Play Store Beta:** Configure `eas.json` and ship v1.0 beta to the first 50–100 testers.
- **Target BIP Post #10:** *"It's Live! Launching Vow to Our First 100 Beta Testers"*

### Milestone 11 (Post-Beta): Revenue & Partner Venues
- **Vow Plus Subscriptions:** RevenueCat (Apple IAP / Google Play Billing) for Single & Couple premium tiers.
- **Partner Venue Bookings:** Paystack / Yoco local ZAR bookings with hand-onboarded partner restaurants & 10% B2B commission once active couples are live.
