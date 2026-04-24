# DropSpace

**The All in One App for Product Launches**

DropSpace is a social discovery platform for upcoming product launches and brand drops. Users scroll through a feed to discover upcoming releases across sneakers, tech, streetwear, gaming, AI tools, creator merch, and limited edition collaborations.

## ✨ Features

- 🔥 **Scrollable Drop Feed** — Instagram-style feed of upcoming product launches
- ⏰ **Live Countdown Timers** — Real-time countdowns to every drop
- 📈 **Trending Drops** — Community-ranked hottest launches with hype scores
- 📅 **Drop Calendar** — Timeline view of upcoming launches by date
- 🏷️ **Categories** — Browse drops by Sneakers, Tech, Gaming, Streetwear, AI Tools, Creator Merch, Limited Edition
- 🔖 **Save Drops** — Bookmark launches you're interested in
- 🔔 **Notify Me** — Set reminders for upcoming drops
- 💬 **Comments** — Community discussions on each drop
- 📊 **Brand Dashboard** — Create drops and view analytics
- 🎨 **Dark Mode Design** — Premium black & blue glassmorphism UI

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: TailwindCSS 4
- **Font**: Inter (Google Fonts)
- **Language**: JavaScript (React)

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Admin Console

```bash
# one-time install
npm run admin:install

# run private admin console
npm run admin:dev

# Open http://localhost:3200
```

## 📁 Project Structure

```
├── app/
│   ├── layout.js          # Root layout with navbar
│   ├── page.js            # Home feed
│   ├── globals.css        # Design system
│   ├── trending/page.js   # Trending drops
│   ├── calendar/page.js   # Drop calendar
│   ├── categories/page.js # Category browser
│   ├── saved/page.js      # Saved drops
│   ├── dashboard/page.js  # Brand dashboard
│   └── drop/[id]/page.js  # Drop detail + comments
├── components/
│   ├── Navbar.js          # Navigation bar
│   ├── DropCard.js        # Drop card component
│   ├── CountdownTimer.js  # Live countdown
│   └── HypeScore.js       # Hype score meter
├── lib/
│   └── drops.js           # Mock data & utilities
└── public/                # Static assets
```

## 📋 Roadmap

- [ ] User authentication (Google OAuth)
- [ ] Real backend (Express + PostgreSQL)
- [ ] Image upload for drops
- [ ] Push notifications
- [ ] AI drop recommendations
- [ ] Affiliate links & monetization
- [ ] Mobile app (React Native)

## 📄 License

MIT

---

Built with 🖤💙 by the Dropout team
