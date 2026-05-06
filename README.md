# E-Class Educational System 🎓🤖

A premium, all-in-one educational platform designed for educators. It features a high-aesthetic **Next.js 16 Administrative Portal** and a fully integrated **Telegram Bot** for automated student registration, real-time timed quizzes, and study material distribution.

---

## 🌟 Key Features

### 👨‍🎓 For Students (Telegram Bot)
- **Instant Registration**: Students register with their full name and phone number directly via the bot.
- **Timed Quizzes**: Participate in live, competitive quizzes using Native Telegram Polls.
- **Dynamic Scoring**: Points are calculated based on accuracy and response time (15s rule).
- **Study Materials**: Access and download PDF tutorials and past papers organized by category.
- **Live Leaderboard**: Real-time ranking of students based on their quiz performance.
- **Automated Results**: Receive a professionally generated PDF Answer Key after each quiz session.

### 👨‍💼 For Administrators (Dashboard)
- **Secure Management Hub**: A dedicated `/admin` portal protected by encrypted session cookies.
- **Quiz Orchestrator**: Create, schedule, and broadcast quizzes to your Telegram channel.
- **Resource Manager**: Upload and categorize PDF study materials.
- **Student Analytics**: View and search registered students and their contact details.
- **Live Monitoring**: Track active quiz progress and winner standings.

---

## 🛠️ Technology Stack

- **Frontend/Admin**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Icons.
- **Backend**: Next.js Route Handlers (Edge & Node.js).
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS).
- **Telegram Logic**: `node-telegram-bot-api`.
- **PDF Generation**: `pdfkit` & `pdf-lib`.

---

## 🚀 Getting Started

Follow these steps to set up the system on your local machine.

### 1. Prerequisites
- **Node.js**: Ensure you have Node.js (v18 or higher) installed.
- **Supabase Account**: Create a free project at [supabase.com](https://supabase.com/).
- **Telegram Bot**: Create a bot via [@BotFather](https://t.me/botfather) and get the API Token.
- **Telegram Channel**: Create a channel where the quizzes will be posted and add your bot as an administrator.

### 2. Installation
```bash
git clone https://github.com/pramodchandima/EClass-OS.git
cd EClass-OS
npm install
```

### 3. Database Configuration
1. Login to your **Supabase Dashboard**.
2. Go to the **SQL Editor**.
3. Copy the contents of the `eclass.sql` file (found in the root of this project) and run it. This will create all necessary tables (`students`, `polls`, `materials`, etc.) and the `leaderboard` view.

### 4. Environment Variables
Create a file named `.env` in the root directory and fill in your details:

```env
# Supabase Credentials (Found in Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Telegram Credentials
TELEGRAM_BOT_TOKEN=your-bot-token-from-bot-father
TELEGRAM_CHANNEL_ID=-100xxxxxxxxxx  # Your channel ID (use @userinfobot to find it)

# Admin Security
ADMIN_PASSWORD=your-secure-password  # Use this to log in to /admin

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Running Locally
Start the development server:
```bash
npm run dev
```

### 6. Exposing to Telegram (Optional / Webhooks)
If you need to test Telegram interactions locally, you can use **ngrok**:
```bash
ngrok http 3000
```
Update your `NEXT_PUBLIC_APP_URL` in `.env` with the ngrok URL (e.g., `https://xxxx-xxx.ngrok-free.dev`).

### 7. Accessing the Portal
- **Landing Page**: `http://localhost:3000`
- **Admin Dashboard**: `http://localhost:3000/admin` (Redirects to login)
- **Admin Login**: Use the `ADMIN_PASSWORD` from your `.env` file.

---

## 🔒 Security & Deployment
- The project is configured with **Row Level Security (RLS)** to protect your database.
- Always use the **Service Role Key** only in server-side logic (already configured in `lib/supabaseAdmin.ts`).
- For production, it is recommended to deploy on **Vercel** for the best Next.js compatibility.

---
*Designed & Developed by Pramod*
