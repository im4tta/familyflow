<div align="center">

<img src="https://api.dicebear.com/7.x/shapes/svg?seed=FamilyFlow&backgroundColor=6366f1&size=80" width="80" height="80" alt="FamilyFlow Logo" />

# FamilyFlow

**A beautiful, all-in-one family management app — built with love.**

Track your child's growth, health, finances, and daily life in one elegant Progressive Web App, powered by AI and synced to the cloud.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![Neon](https://img.shields.io/badge/Neon-Postgres-00E699?style=flat-square&logo=postgresql)](https://neon.tech)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google)](https://ai.google.dev)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps)

</div>

---

## What is FamilyFlow?

FamilyFlow is a **Progressive Web App** designed for modern families to manage everything in one place — from a baby's first steps to monthly budgets, vaccination schedules, and family trips. It works offline, installs on any device, and speaks both **English and Khmer (ភាសាខ្មែរ)**.

---

## Features

### 🏠 Dashboard
A live overview of your family's day — upcoming appointments, active illnesses, recent expenses, latest growth measurements, and next developmental milestones at a glance.

### 👶 Development
- Track **physical, cognitive, and social milestones** against WHO standards
- Log **growth measurements** (height, weight, head circumference) with visual charts
- Compare against WHO Child Growth Standards with interactive graphs

### 🏥 Health
- Full **medical history** per family member — vaccines, visits, medications, illnesses, allergies, grooming
- **Vaccination schedule** aligned to Cambodia's national immunization program
- Medication tracker with dosage, frequency, and photo support
- **Emergency card** with blood type, allergies, and doctor info

### 💰 Finance
- Track **expenses** by category (Medical, Food, Childcare, Toys, Clothes, Travel)
- **Subscription manager** with auto-renewal tracking and lifecycle status
- **Monthly budget** with visual spend vs. budget progress
- **Home Loan Tracker** — CIMB approval pipeline, amortization schedule, early payoff simulator, and lock-in period countdown

### 🗓️ Planning
- Plan **family trips** with itinerary tasks, start/end times, and status tracking
- Save **ideas** for future adventures
- Duplicate and manage trip templates

### 📊 Analytics
- Monthly expense charts and health event breakdowns
- Illness frequency trends over time
- Export financial, health, and growth data as reports

### 👨‍👩‍👧 Caregivers
- Manage **family member profiles** with roles, access levels, and medical details
- Role-based access: Full, Limited, or View Only
- Supports Parents, Grandparents, Nannies, Babysitters, and Children

### 🤖 AI Advisor
- Powered by **Google Gemini 2.0 Flash**
- Ask questions about symptoms, vaccines, development, and health trends
- Get **AI-generated child development insights** with growth summaries and activity suggestions
- **Quick Add** — describe an expense or health record in plain language and AI parses it into structured data
- Fully bilingual responses (English & Khmer)

### 📅 Calendar
- Unified family calendar with health events, trips, and milestones
- **Khmer lunar calendar** integration with zodiac year, Buddhist era, and lunar day

### ⚙️ Settings
- 10 accent color themes, 5 font choices, 3 UI styles (Glass, Minimal, Neumorphic)
- 6 animated live backgrounds (Floating Lines, Pixel Snow, Dot Grid, Color Bends, Prism)
- Adjustable glass intensity, corner radius, and layout density
- Full English / Khmer language toggle

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 5.8 |
| Build Tool | Vite 6 |
| Database | Neon Serverless Postgres |
| AI | Google Gemini 2.0 Flash (`@google/genai`) |
| Charts | Recharts |
| Icons | Lucide React |
| PWA | Web App Manifest + Service Worker |
| Styling | Tailwind CSS (via CDN) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) database (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/familyflow.git
cd familyflow

# Install dependencies
npm install
```

### Environment Setup

Create a `.env.local` file in the root:

```env
GEMINI_API_KEY=your_google_gemini_api_key
DATABASE_URL=postgres://user:password@host/dbname?sslmode=require
```

> The app will auto-initialize the database schema on first run — no manual migrations needed.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
```

---

## Database

FamilyFlow uses **Neon Serverless Postgres**. The schema is auto-created on first launch via `initDB()`. You can also find the full schema in [`db_schema.sql`](./db_schema.sql).

Tables: `milestones`, `health_records`, `expenses`, `trips`, `caregivers`, `growth_records`, `app_settings`

---

## PWA Installation

FamilyFlow is installable as a native-like app on any device:

- **Android / Chrome**: Tap the "Add to Home Screen" prompt
- **iOS / Safari**: Share → Add to Home Screen
- **Desktop / Chrome**: Click the install icon in the address bar

---

## Localization

The app supports full bilingual UI:

| Language | Code |
|---|---|
| English | `en` |
| Khmer (ភាសាខ្មែរ) | `km` |

Switch languages anytime from the Settings screen.

---

## Security Notes

- All credentials must be stored in `.env.local` — never committed to version control
- `.env.local` is listed in `.gitignore`
- The app uses environment variables injected at build time via Vite
- Authentication is session-based using `localStorage`

---

## License

MIT — free to use, modify, and distribute.

---

<div align="center">

Built with ❤️ for families everywhere.

</div>
