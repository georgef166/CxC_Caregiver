# 🌍 CareGlobe

**Empowering caregivers of Parkinson's patients with AI-powered tools and seamless care coordination.**

Built for the CxC 2026 Hackathon.

---

## 🎯 What is CareGlobe?

CareGlobe is a comprehensive caregiving platform designed to support caregivers of Parkinson's disease patients. It bridges the gap between caregivers and patients through:

- **Two-way patient-caregiver linking** with secure invite codes
- **AI-powered symptom logging** using natural language
- **Care summaries** generated for doctor visits
- **Medication tracking** with comprehensive history
- **Emergency contact management**
- **Healthcare provider directory**

---

## ✨ Features

### For Caregivers
- 📋 **AI Symptom Logging** - Describe symptoms naturally, AI categorizes severity
- 📊 **AI Insights** - Pattern analysis of symptoms over time
- 📝 **Care Summaries** - Generate reports for doctor appointments
- 💊 **Medication Tracking** - View and manage patient medications
- 🚨 **Emergency Contacts** - Quick access to important contacts
- 👨‍⚕️ **Healthcare Providers** - Directory of doctors and specialists

### For Patients
- 🔗 **Secure Linking** - Approve caregivers with unique codes
- 📱 **Profile Management** - Manage personal health information
- 🩺 **Onboarding Flow** - Step-by-step health profile setup

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Styling |
| **Supabase** | Database & Authentication |
| **Auth0** | User authentication |
| **OpenRouter** | AI API gateway |
| **Gemini 2.0 Flash** | AI model for NLP tasks |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Auth0 account
- OpenRouter API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/georgef166/CxC_Caregiver.git
   cd CxC_Caregiver/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.local.example` to `.env.local` and fill in your values:
   ```env
   # Auth0
   AUTH0_SECRET='your-auth0-secret'
   AUTH0_ISSUER_BASE_URL='https://your-tenant.auth0.com'
   AUTH0_CLIENT_ID='your-client-id'
   AUTH0_CLIENT_SECRET='your-client-secret'
   AUTH0_DOMAIN='your-tenant.auth0.com'
   AUTH0_SCOPE='openid profile email'
   APP_BASE_URL='http://localhost:3000'
   
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'
   NEXT_PUBLIC_SUPABASE_ANON_KEY='your-anon-key'
   SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
   
   # AI (OpenRouter)
   OPENROUTER_API_KEY='your-openrouter-api-key'
   ```

4. **Set up the database**
   
   Run the SQL in `supabase/schema.sql` and `supabase/migration.sql` in your Supabase SQL Editor.

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   
   Visit [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes (AI chat, etc.)
│   │   ├── auth/         # Auth0 callbacks
│   │   ├── dashboard/    # Patient & Caregiver dashboards
│   │   └── onboarding/   # User onboarding flow
│   ├── components/       # React components
│   │   ├── ai-agent.tsx  # AI-powered action buttons
│   │   ├── caregiver-dashboard.tsx
│   │   └── patient-dashboard.tsx
│   └── lib/              # Utilities
├── supabase/
│   ├── schema.sql        # Full database schema
│   └── migration.sql     # Incremental migrations
└── public/               # Static assets
```

---

## 🤖 AI Features

CareGlobe uses **Gemini 2.0 Flash** via OpenRouter for:

| Feature | Description |
|---------|-------------|
| **Log Symptoms** | Natural language input → structured symptom data with severity |
| **Care Summary** | Generates doctor-ready reports from health data |
| **AI Insights** | Analyzes symptom patterns and provides recommendations |

The AI gracefully falls back to rule-based processing when API limits are reached.

---

## 🔐 Security

- **Row Level Security (RLS)** on all Supabase tables
- **Two-way approval** for caregiver-patient linking
- **Unique invite codes** for secure connections
- **Auth0** for enterprise-grade authentication

---

## 👥 Team

Built with ❤️ for the CxC 2026 Hackathon

---

## 📄 License

MIT License - feel free to use and modify for your own projects!
