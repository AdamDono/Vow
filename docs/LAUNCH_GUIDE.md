# 🚀 Vow — Production Cloud Deploy & Real-Phone Beta Launch Guide

Follow these exact steps to get **Vow** off `localhost` and onto real iPhones & Android phones in ~10 minutes.

---

## Step 1: Push Your Latest Code to GitHub
```bash
git push origin main
```

---

## Step 2: Deploy the Backend API + WebSockets (Render or Railway)

### Option A: Render (1-Click Blueprint — Free Tier with WebSockets)
1. Go to [render.com](https://render.com) → **New +** → **Blueprint**.
2. Connect your Vow GitHub repo (it auto-detects `render.yaml` & `backend/Dockerfile`).
3. Fill in your 2 secret env vars when prompted:
   - `DATABASE_URL` (your Neon Postgres URL from `backend/.env`)
   - `UPLOADTHING_TOKEN` (your UploadThing token from `backend/.env`)
   *(Render auto-generates a strong `JWT_SECRET` for you!)*
4. Deploy! Verify health check at `https://vow-api.onrender.com/health`.

### Option B: Railway
1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub Repo** → set **Root Directory** to `backend`.
2. Add env vars (`NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `UPLOADTHING_TOKEN`).
3. Railway detects `backend/Dockerfile` automatically and gives you a live HTTPS + WSS URL!

---

## Step 3: Point Mobile App to Your Live Backend URL
Update `EXPO_PUBLIC_API_URL` in **`mobile/eas.json`** (both `preview` and `production`) to your deployed backend URL (e.g., `https://vow-api.onrender.com`).

---

## Step 4: Build & Install on Real Phones (EAS Build)
```bash
cd mobile
npm install -g eas-cli
eas login
eas init
```

### Android Instant Beta APK (Fastest — Share Download Link Directly!)
```bash
eas build --platform android --profile preview
```
When it finishes (~5 mins), Expo gives you a QR code & direct `.apk` link you can text to your first beta testers.

### iOS TestFlight Beta (Requires Apple Developer Account)
```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```
Once submitted, open **App Store Connect → TestFlight → External Testing** to generate your public beta invite link and drop it in your Build In Public Post #10!

---

## ✅ Pre-Launch Verification Checklist
- [ ] `GET https://<your-api>/health` returns `{"status":"ok"}`
- [ ] WebSocket connects at `wss://<your-api>/ws?token=<JWT>`
- [ ] Two real phones can match, chat live, send Date Proposals, and lock into Couples Mode
- [ ] Push notifications arrive when app is backgrounded (new match, message, Vow Proposal, check-in)
- [ ] Facial Liveness camera check works on front camera and awards the **Face Verified** badge
- [ ] Live Date Night Spots pulls real nearby restaurants and opens Google Maps
