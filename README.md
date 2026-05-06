# E-Class Educational System 🎓🤖

A next-generation educational ecosystem combining a powerful **Next.js 16 Admin Portal** and an interactive **Telegram Bot**. This platform allows educators to manage students, distribute study materials, and conduct real-time, timed quizzes directly inside Telegram.

## 🌟 Features

### For Students (Telegram Bot)
- **Seamless Registration**: Students register directly via Telegram.
- **Interactive Quizzes**: Real-time timed quizzes using Native Telegram Polls.
- **Instant Scoring**: Automated scoring based on response time and accuracy.
- **Material Access**: Download PDF tutorials, past papers, and study guides.
- **Leaderboards**: View top performers and personal rank.
- **Automated Answer Keys**: Receives dynamically generated PDF answer keys with explanations after quizzes.

### For Administrators (Next.js Dashboard)
- **Secure Admin Portal**: Protected dashboard for complete ecosystem management.
- **Quiz Scheduling**: Create, schedule, and trigger mass quiz sessions.
- **Material Management**: Upload and categorize PDFs and resources.
- **Student Analytics**: Track student engagement and performance over time.

## 🚀 Tech Stack

- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, Lucide Icons.
- **Backend**: Next.js API Routes (Serverless), Node.js.
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS) and Realtime Subscriptions.
- **Bot Framework**: `node-telegram-bot-api`.
- **PDF Generation**: `pdfkit`.

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- A [Supabase](https://supabase.com/) account and project.
- A Telegram Bot Token from [BotFather](https://t.me/botfather).

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repository-url>
   cd eclassbot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Database Setup:**
   - Go to your Supabase SQL Editor.
   - Run the SQL scripts provided in the root directory (e.g., `eclass.sql`, `migration_native_polls.sql`, etc.) to create the necessary tables and policies.

4. **Environment Variables:**
   - Create a `.env` file in the root directory.
   - Add the following keys (replace with your actual credentials):
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     TELEGRAM_BOT_TOKEN=your-telegram-bot-token
     TELEGRAM_CHANNEL_ID=-100xxxxxxxxxx
     ADMIN_PASSWORD=your-secure-password
     NEXT_PUBLIC_APP_URL=http://localhost:3000
     ```

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```

6. **Access the Admin Portal:**
   - Navigate to `http://localhost:3000/admin/login`
   - Use the `ADMIN_PASSWORD` you set in the `.env` file to log in.

## 🔒 Security & Privacy
This repository is configured to exclude all private credentials and environment files (`.env`). Please ensure you do not hardcode any sensitive API keys or passwords directly into the source code before pushing to public repositories.

---
*Designed & Developed by Pramod*
