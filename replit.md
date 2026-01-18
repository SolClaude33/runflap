# XMAS Pumpfun Race - Solana Racing Game

## Overview
XMAS Pumpfun Race is a Solana-based multiplayer racing game with a festive holiday theme where users connect their Solana wallets, bet SOL on characters, and watch programmatically-animated races with random outcomes. Built with Next.js 13, TypeScript, and Tailwind CSS.

**Token**: $XPR
**CA**: `55PRPBCT2RmWuvG2tr8bdUfffoNLPXqvJHZ9aJ8Mpump`
**Twitter**: https://x.com/xmaspfrace
**Website**: https://xmaspumpfunrace.run

## Recent Changes (December 23, 2025)
- **PRODUCTION READY**: Prepared for mainnet launch
  - Bet amounts updated: 0.1, 0.25, 0.5, 1, 2, 5 SOL
  - Smart +/- increments: 0.1 step when < 1 SOL, 0.5 step otherwise
  - All UI text now in English (JackpotPanel translated)
  - Security audit passed: all secrets in Replit env, no sensitive data exposed
  - Commentator text styling improved with clean multi-shadow outline
- **FAVICON & SOCIAL PREVIEW**: New branded favicon and Open Graph image
  - Favicon (32x32) created from updated XPR logo
  - OG image (1200x630) for Discord/Twitter/social media previews
  - Proper meta tags in layout.tsx (icons, openGraph, twitter)
  - Fixed 500 error from old icon.png file
- **WHITEPAPER MODAL**: PDF viewer via API route `/api/whitepaper`
- **IMPROVED COMMENTATOR**: Transparent background with white text and green outline
- **JACKPOT DRAW SYSTEM**: Automatic jackpot distribution every 50 races
  - Race counter synced with Firebase (starts from 0)
  - Jackpot distributed to random active bettor every 50 races
  - Active bettors = anyone who bet in last 50 races
  - After distribution, counter resets to 0
  - JackpotPanel shows: current race, races until next draw, last winner
  - New Firebase collections: `jackpot_state`, `jackpot_winners`
  - API endpoints:
    - `/api/jackpot/state` - Current race state
    - `/api/jackpot/bettors` - Get active bettors
    - `/api/jackpot/draw` - Execute draw (requires ADMIN_SECRET)
    - `/api/cron/jackpot-draw` - Cron-triggered draw (requires CRON_SECRET)
    - `/api/jackpot/record-winner` - Record winner in Firebase
- **PUMP.FUN CREATOR REWARDS AUTO-CLAIM**: Flywheel system for $XPR token rewards
  - **EVENT-DRIVEN ARCHITECTURE**: Helius webhook monitors blockchain for fee deposits
  - Direct interaction with Pump.fun program on Solana mainnet (no third-party APIs)
  - Shared claim logic in `src/lib/claim-rewards.ts`
  - API routes:
    - `/api/webhooks/pumpfun` - Helius webhook (auto-claim on fee detection)
    - `/api/claim-rewards` - Manual claim (requires ADMIN_SECRET)
    - `/api/cron/auto-claim` - Fallback cron endpoint (requires CRON_SECRET)
    - `/api/jackpot/balance` - Public jackpot balance
  - JackpotPanel component shows real-time balance with Solscan links
  - Minimum claim threshold: 0.01 SOL
  - Secrets required:
    - `CREATOR_WALLET_PRIVATE_KEY` - Signs claim transactions
    - `TOKEN_MINT_ADDRESS` - $XPR token contract (after launch)
    - `HELIUS_API_KEY` - For RPC calls
    - `HELIUS_WEBHOOK_SECRET` - Validates webhook requests
    - `ADMIN_SECRET` - Manual claim auth
    - `CRON_SECRET` - Fallback cron auth

## Changes (December 21, 2025)
- **ABOUT MODAL**: About now opens as a smooth overlay modal instead of a separate page
  - Frosted glass effect with dark backdrop blur
  - Fade-in and slide-up animations
  - Close with X button or Escape key
  - Click outside to close
- **CHRISTMAS THEME ON /RACE**: 
  - Snowfall animation with 30 floating snowflakes
  - Christmas lights bar at top of page (red/green/gold twinkling)
  - All animations are non-intrusive (pointer-events: none)

## Previous Changes (December 11, 2025)
- **MOBILE OPTIMIZATION**: Fully responsive layout for mobile devices
  - Vertical stack layout on mobile, grid on desktop
  - Compact navbar with essential info (race #, prize pool)
  - 2-column character grid on mobile, 4 on desktop
  - Floating buttons for Chat and Bets overlays
  - All panels slide up from bottom as overlays
  - Auto-close overlays when race starts
- **WINNER CELEBRATION POPUP**: Personalized video popup for each winner (Pepe, Alon, Cupsey, Wojack) with golden glowing border, character accent colors, and smooth animations
- **VIDEO FADE TRANSITIONS**: Celebration videos fade out at end of loop and fade in at start for smooth looping
- **OBJECT STORAGE**: Video streaming now uses Replit App Storage with correct Bucket ID configuration
- **NEW LOGO**: XPR mascot logo displayed in navbar only
- **PARI-MUTUEL ODDS**: True pari-mutuel system - odds = (poolTotal × 0.95) ÷ charPool. Shows "—" when no bets, real multiplier when bets exist
- **IMPROVED COMMENTATOR**: White text with golden glow for better contrast during races
- **SIMPLIFIED HELP MODAL**: House fee text simplified to "5% house fee"
- **CONFETTI CELEBRATION**: Golden confetti explosion when race finishes, uses winner's car color
- **SOUND EFFECTS**: Racing music (MP3) during races at low volume, countdown beeps, GO! fanfare, victory melody
- **RACE COMMENTATOR**: Dynamic text overlays during race - "LIGHTS OUT AND AWAY WE GO!", lead changes, "FINAL LAP!", winner announcements
- **RACE STATUS PANEL**: Horizontal panel ABOVE video area with dynamic states (betting/pre-countdown/racing/finished), consistent race numbering, golden countdown timer
- **F1/NASCAR HYBRID TRACK**: Improved gradients (sky, grass, asphalt), outer safety barrier, cleaner curbing stripes, F1-style start gantry with 5 red lights, golden sponsor banner, distance markers
- **DRAMATIC SPEED ALGORITHM**: Mulberry32 PRNG, equal base speeds (370), ±15% dramatic swings, SURGE/STUMBLE events (5% each), strong rubber-banding (up to 15%), leader penalty (8% drag), final lap surge, mid-race shakeup - ANY CAR CAN WIN
- **IMPROVED CAR DESIGN**: F1-style sleek body with path shapes, body highlights, detailed cockpit with blue glass, racing stripes, detailed wheels (3 layers), exhaust flames glow
- **VIDEO BETTING SCREEN**: loading.mp4 plays as full background during betting period (no overlay obstructing video)
- **PROFESSIONAL TRACK SVG**: Layered gradients, red/white checkered curbing, grandstands with spectators, palm trees at corners
- **3-LAP RACES**: Races require 3 complete laps with visible LAP counter
- **POSITION BADGES**: Each car shows position using SVG paths (no text)
- **DARK COLOR PALETTE**: Dark greens (#0d3320, #1a4a2e, #2d6b4a)
- **SOLANA MAINNET**: Real SOL transactions with secure server-side payout API
- **SECURE PAYOUTS**: Server-side API route handles house wallet transactions
- Prize distribution: 95% to winner, 5% house rake

**COLOR PALETTE:**
- Background: #0d3320 (dark), #1a4a2e (medium), #2d6b4a (light)
- Text: white, white/80 (muted), #7cb894 (green accent)
- Golden accent: #d4a517 (highlights, buttons, 1st place)
- Track curbs: #e63946 (red), #f1faee (white)

**VIDEO STREAMING:**
- Video served via /api/video with HTTP 206 Range request support
- 32MB loading.mp4 with streaming for efficient playback
- Video included in public/ directory for production builds

**KNOWN ISSUES:**
- Firebase chat/bets require Firestore rules configuration (see `public/firebase-rules-example.txt`)
- Icon.png route returns 500 (cosmetic, doesn't affect functionality)
- Video may show black briefly while loading (32MB file)

## Project Architecture

### Tech Stack
- **Framework**: Next.js 13.4.12 with App Router
- **Language**: TypeScript 5.1.6
- **Styling**: Tailwind CSS 3.3.3
- **Blockchain**: Solana (@solana/web3.js, wallet-adapter)
- **Backend**: Firebase 10.1.0 (Firestore for profiles, chat, bets)
- **UI Components**: Flowbite React, react-hot-toast, react-icons

### Project Structure
```
src/
├── app/
│   ├── components/
│   │   ├── Race/
│   │   │   ├── RaceTrack.tsx      # Animated race circuit with glow effects
│   │   │   ├── BettingPanel.tsx   # SOL betting with auto-bet mode
│   │   │   └── CharacterSelect.tsx # Character selection
│   │   ├── Chat/
│   │   │   └── WalletChat.tsx     # Real-time Firebase chat
│   │   ├── Wallet/
│   │   │   ├── WalletButton.tsx   # Wallet connect button
│   │   │   └── ProfileModal.tsx   # Profile setup modal
│   │   └── Providers.tsx          # App providers
│   ├── contexts/
│   │   └── SolanaProvider.tsx     # Solana wallet context
│   ├── firebase/
│   │   └── index.ts               # Firebase config with real-time listeners
│   ├── race/
│   │   └── page.tsx               # Main race page
│   ├── layout.tsx
│   └── page.tsx                   # Landing page
public/
├── race/
│   ├── circuit.png               # Race track image
│   ├── racer1-4.png             # Racer markers
│   ├── select1-4.png            # Character selection images
│   └── loading.mp4              # Transition video between races
```

### Race System
- **Race States**: betting (30s) -> pre_countdown (5s) -> countdown (3,2,1) -> racing -> finished (5s) -> betting
- **Laps**: 3 complete laps required to win
- **Animation**: Uses requestAnimationFrame for smooth movement with glow effects
- **Winner**: Determined by first racer to complete 3 laps (random speed variations)
- **Betting**: Must bet before race starts, locked during racing
- **Auto-bet**: Optional mode to automatically place same bet each race
- **Prize Distribution**: 95% to winner, 5% house rake

### Wallet Integration
- Uses Solana wallet-adapter-react for wallet connection
- Supports Phantom and Solflare
- Requires profile setup (display name) to participate

### Firebase Configuration
Environment variables required:
- NEXT_PUBLIC_APIKEY
- NEXT_PUBLIC_AUTHDOMAIN
- NEXT_PUBLIC_DATABASEURL
- NEXT_PUBLIC_PROJECTID
- NEXT_PUBLIC_STORAGEBUCKET
- NEXT_PUBLIC_MESSAGINGSENDERID
- NEXT_PUBLIC_APPID

**IMPORTANT: Firebase Security Rules Required**
You must configure Firestore rules for the app to work. See `public/firebase-rules-example.txt` for the rules to paste into Firebase Console > Firestore > Rules.

Collections used:
- `chat_messages`: Real-time chat messages
- `live_bets`: Bets for current race
- `profiles`: User profiles

## Development

### Running Locally
```bash
npm run dev
```
Starts on port 5000.

### Building for Production
```bash
npm run build
npm start
```

## Deployment
Configured for Replit Autoscale:
- Build: `npm run build`
- Run: `npm start`
- Port: 5000

## Solana Integration
- **Network**: Mainnet (api.mainnet-beta.solana.com)
- **House Wallet**: Configured via NEXT_PUBLIC_SOLANA_HOUSE_WALLET
- **Creator Wallet**: CREATOR_WALLET_PRIVATE_KEY (for Pump.fun fee claims)
- **Private Key**: SOLANA_HOUSE_PRIVATE_KEY (encrypted secret, server-side only)
- **Payout API**: /api/payout (secure server-side transaction signing)
- **Claim Rewards API**: /api/claim-rewards (claim Pump.fun creator fees)
- **Auto-Claim Cron**: /api/cron/auto-claim (periodic fee collection)
- **Jackpot Balance**: /api/jackpot/balance (real-time jackpot + pending fees)
- **Bet Flow**: User signs transaction -> SOL sent to house -> Winner receives 95%

## Pump.fun Flywheel
```
Token Trading Volume ($XPR)
       ↓
Creator Rewards (0.05% of volume)
       ↓
Auto-Claim (when > 0.01 SOL)
       ↓
SOL → Creator/Jackpot Wallet
       ↓
Jackpot Pool grows
       ↓
Bigger prizes attract players
       ↓
More trading volume 🔄
```

## Future Features
- Jackpot distribution every X races
- Transaction history panel with Solscan links
- Leaderboards and betting history

## User Preferences
- Spanish language support requested
- Programmatic race animations (no pre-made GIFs)
- SOL-based betting (not USD)
