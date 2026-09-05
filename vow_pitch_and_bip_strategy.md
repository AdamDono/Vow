# Vow — Pitch Deck & Build in Public (BIP) Strategy

This master document compiles Vow's investor pitch deck alongside a weekly content creation strategy designed to build the app in public across YouTube, TikTok, and social media.

---

## PART 1: The Pitch Deck (Slide-by-Slide)

### Slide 1: The Hook
* **Title:** VOW
* **Subtitle:** The Relationship Operating System
* **Tagline:** A single, trusted platform that carries people from a verified single life into a thriving, well-tended relationship — and keeps them there.
* **Visual Vibe:** Sleek, warm-white interface, soft peach/rose gradients, clean editorial layout.

### Slide 2: The Problem
* **Headline:** Modern Dating Is Broken
* **The Fatigue:** Swipe-first platforms (Tinder, Bumble) reward superficial browsing, leading to endless talking stages and dating fatigue.
* **The Anonymity Trap:** No way to confirm relationship history or true intentions outside of self-reports.
* **The Retention Loophole:** A traditional dating app's best outcome (a happy relationship) results in losing both users forever.

### Slide 3: The Solution
* **Headline:** The Lifecycle of Love Platform
* **Vow Platform History:** Authenticity guaranteed via facial liveness verification. New users start fresh, but past relationships formed and ended on Vow generate verified, in-app relationship metrics over time.
* **The Commitment Lock:** When two users match and accept relationship status, the app transitions them to Couples Mode and removes them from the singles market.
* **The Relationship Pulse:** A private, shared dashboard for active couples to keep connection alive.

### Slide 4: One App, Two Modes
* **Headline:** Shifting the Job of the App
* **Single Mode:** Traditional swipe deck, enhanced by facial liveness and in-app relationship history. Matches unlock deeper profiles and a "Propose Relationship" CTA.
* **Couples Mode:** A shared dashboard featuring private, double-blind daily mood check-ins, compatibility scores, and collaborative timeline tracking.

### Slide 5: Market Opportunity
* **TAM:** $9B+ Global Dating App Market.
* **The Opportunity:** Capturing the massive, untapped "Relationship Maintenance" sector. 
* **The Trend:** Singles are tired of starting over on dating apps with zero context. VOW solves this by building a persistent, verified platform history that carries forward.

### Slide 6: Monetization Model
* **Premium Subscriptions:**
  * Single Mode: Pay to view who liked you, verify profile, or boost discovery.
  * Couples Mode: Premium wellness check-ins, relationship analytics, and counseling integrations.
* **B2B Marketplace Commission:**
  * 10% transaction fee taken on date night reservations (restaurants, spas, getaways) booked directly through the Couples Mode dashboard.

### Slide 7: Technology Architecture
* **Frontend:** React Native + Expo (cross-platform iOS & Android).
* **Styling:** Tamagui Primitives (buttery smooth native rendering on mobile, web-capable).
* **Backend:** Supabase (PostgreSQL, Realtime subscriptions for double-blind sync, Edge Functions).

### Slide 8: Built-in Network Effects
* **Accountability Keeps Singles:** Bad actors get filtered out because the platform rewards long-term, verified track records. 
* **Retention Keeps Couples:** Instead of deleting the app, couples keep it active to track their relationship health, preserving user LTV.
* **The Re-entry Loop:** If a couple breaks up, they return to the swipe deck carrying their verified relationship length and mutual respect rating.

### Slide 9: The Founders
* **Adam Dono (Founder & Product Lead):** Visionary UI/UX Designer and Full-Stack Developer (5 years exp.) bridging stunning visual aesthetics with robust technical execution.
* **Co-Founder (Tech Lead & SecOps):** Expert Security & Infrastructure Engineer (4 years exp.) designing resilient, zero-trust cloud environments and database schemas.

### Slide 10: The Ask & Execution
* **The Ask:** $750k SAFE (Post-Money Cap: $5.0M)
* **Runway:** 18 Months of operating capital.
* **Milestones (18 Months):**
  * Scale to 100k active users across 3 major urban hubs.
  * Achieve $30k Monthly Recurring Revenue (MRR).
  * Build a clear path to a Series Seed.

---

## PART 2: Build in Public (BIP) YouTube & Social Strategy

Building in public is one of the most powerful organic marketing engines. The "Tinder vs. Vow" narrative and the unique transition between Single and Couples Mode make this project highly shareable.

### 🎥 8-Week YouTube Video Roadmap

#### Episode 1: "I'm building an app to put Tinder out of business"
* **Hook:** Why Hinge/Tinder want you to stay single (so you keep paying) and how Vow breaks that business model by turning into a couples app.
* **What you build/show:** 
  * Show the Figma/design assets and mockups.
  * Scaffold the Expo app, set up the folder structure, and configure the Tamagui theme tokens.
* **Call to Action:** Ask viewers what colors/styles they prefer for a clean, Hinge-like feel.

#### Episode 2: "Can you prove you're real? Coding facial verification"
* **Hook:** The catfishing problem on dating apps. Building the facial liveness check.
* **What you build/show:**
  * Integrating the phone camera in Expo.
  * Coding a simple on-device facial detection feedback loop (Google ML Kit).
* **Call to Action:** Share your worst catfishing story in the comments.

#### Episode 3: "Making the perfect swipe gesture from scratch"
* **Hook:** The satisfying feel of Hinge and Tinder cards. How UI/UX micro-animations make or break a mobile app.
* **What you build/show:**
  * Coding the swipe deck using `react-native-gesture-handler` and `react-native-reanimated`.
  * Show how spring physics make the card snap back or fly off screen.
* **Call to Action:** Should we swipe left/right, or do a vertical scroll like Hinge?

#### Episode 4: "I coded a button to lock you out of dating"
* **Hook:** Building the "Commitment Lock" — the moment Vow transitions a user from single to coupled, instantly removing them from the swipe market.
* **What you build/show:**
  * Designing and coding the "Send Vow" / Proposal modal.
  * Coding the state shift that changes the entire app's layout from single tabs to couples tabs.
* **Call to Action:** Poll: Is "sending a Vow" too intense, or is it the perfect relationship benchmark?

#### Episode 5: "Coding a private digital space for couples"
* **Hook:** How to build features that keep couples together. Handling double-blind data privacy.
* **What you build/show:**
  * Setting up the Couples Dashboard.
  * Building the double-blind Daily Mood check-in (checking in privately, results reveal only when both complete it).
* **Call to Action:** What couples features would you want in a shared relationship app?

#### Episode 6: "How this app actually makes money without ads"
* **Hook:** The business side. Breaking down the subscriptions and B2B date night booking engine.
* **What you build/show:**
  * Designing the Date Night booking screen.
  * Integrating Stripe / Apple Pay for local package bookings.
* **Call to Action:** Would you pay for premium relationship statistics/analytics?

#### Episode 7: "Connecting the database without crashing the app"
* **Hook:** The backend architecture. Setting up a secure, zero-trust Supabase DB.
* **What you build/show:**
  * Designing the PostgreSQL tables.
  * Setting up Row Level Security (RLS) so couples' private check-ins can never be accessed by anyone else.
* **Call to Action:** Ask technical viewers to review your table schema setup.

#### Episode 8: "It's live! Publishing Vow to the App Store"
* **Hook:** The final boss: Apple App Store guidelines and launching the beta to the first 100 users.
* **What you build/show:**
  * Running EAS builds for iOS and Android.
  * Submitting to TestFlight/Google Play Console.
  * Sharing reactions of the first beta testers.
* **Call to Action:** Link to the TestFlight beta signup in the description.

---

### 📱 Short-Form Content (TikTok / Reels / Shorts)

Keep these under 60 seconds, fast-paced, and hook-heavy.

1. **The Visual Hook (15-30s):**
   * *Visual:* Screen capture showing you tapping the "Send Vow" button, the screen goes pink, loads, and instantly transforms from a swipe deck into a Couples Dashboard.
   * *Overlay Text:* "I got tired of dating apps, so I built one that locks you out of swiping when you find a partner."
2. **The UX Critique (30-45s):**
   * *Visual:* Record yourself looking at Tinder's interface, then show Vow's clean, warm white, premium editorial layout.
   * *Topic:* "Why dating app design has gotten so ugly and how to design for emotional safety."
3. **The Coding Hack (15-30s):**
   * *Visual:* Time-lapse coding the reanimated swipe deck physics.
   * *Audio/Text:* Quick breakdown of how Expo and Reanimated allow you to build native animations with standard JS.
