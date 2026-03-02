# 🛍️ PriceWise

<div align="center">

**Smart Purchase Advisor - Compare prices, track trends, and get AI-powered buy/wait recommendations**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.20-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=flat-square&logo=openai)](https://openai.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [API Reference](#-api-reference) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Demo](#-demo)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**PriceWise** is an intelligent shopping assistant that helps you make smarter purchasing decisions by combining real-time price comparison, affordability analysis, and AI-powered recommendations. Instead of manually checking multiple retailers and wondering if now is the right time to buy, PriceWise does all the heavy lifting for you.

### Why PriceWise?

- 🔍 **Multi-Retailer Price Comparison** - Instantly compare prices across Amazon, Walmart, Best Buy, Target, and more
- 🤖 **AI Buy/Wait Recommendations** - Get personalized advice based on seasonal sales, price trends, and your budget
- 💰 **Affordability Calculator** - See exactly how long you'd need to work/save for any purchase
- 📊 **Price History Tracking** - Visualize price trends over time with interactive charts
- 🔔 **Smart Price Alerts** - Get notified when products hit your target price
- 📈 **Personal Dashboard** - Track all your products, alerts, and searches in one place

---

## ✨ Features

### 🔍 **Intelligent Price Comparison**
- Aggregates prices from multiple retailers in real-time
- Deduplicates and ranks results by lowest price
- Shows stock availability and direct purchase links
- Supports Best Buy API and Google Shopping (via Serper)

### 🤖 **AI-Powered Purchase Advisor**
- **GPT-4o-mini** powered conversational agent with tool-calling capabilities
- Analyzes seasonal sales patterns (Black Friday, Prime Day, Back to School, etc.)
- Provides personalized buy/wait recommendations
- Supports multi-turn conversations for follow-up questions
- Context-aware responses based on your budget and preferences

### 💰 **Work-Time Cost Calculator**
- Calculates how many hours/days you'd need to work to afford a product
- Shows percentage of monthly income required
- Provides affordability tiers: **Easy Buy**, **Think It Over**, **Stretch Purchase**, **Major Purchase**
- Estimates time to save based on your savings rate
- Personalized suggestions based on your financial profile

### 📊 **Price History & Trends**
- Interactive charts powered by Recharts
- Historical price tracking across multiple retailers
- Identifies price drops and trends
- Helps predict optimal buying times

### 🔔 **Price Alert System**
- Set target prices for products you're watching
- Automated price checking via cron jobs
- Get notified when prices drop below your threshold
- Manage multiple alerts from your dashboard

### 📈 **Personal Dashboard**
- Track all searched products
- View active price alerts
- See trending searches
- Monitor your most-viewed categories

### 🎨 **Modern UI/UX**
- Dark mode design with gradient accents
- Responsive layout (mobile, tablet, desktop)
- Smooth animations and transitions
- Built with TailwindCSS and Lucide icons
- Accessibility-first approach

---

## 🎥 Demo

### Main Search Interface
Search for any product and get instant results with prices, affordability, and AI recommendations all in one unified view.

### AI Conversation
Ask follow-up questions like:
- "Which retailer should I buy from?"
- "When is the best time to buy this?"
- "Can you share the Best Buy link?"
- "Is this a good deal compared to last month?"

### Dashboard
Track your products, manage alerts, and see trending searches.

---

## 🛠️ Tech Stack

### **Frontend**
- **[Next.js 14](https://nextjs.org/)** - React framework with App Router
- **[React 18](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[TailwindCSS](https://tailwindcss.com/)** - Utility-first CSS
- **[Recharts](https://recharts.org/)** - Data visualization
- **[Lucide React](https://lucide.dev/)** - Icon library

### **Backend**
- **[Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)** - Serverless API endpoints
- **[Prisma](https://www.prisma.io/)** - Type-safe ORM
- **[SQLite](https://www.sqlite.org/)** - Embedded database (easily swappable to PostgreSQL/MySQL)

### **AI & APIs**
- **[OpenAI GPT-4o-mini](https://openai.com/)** - AI advisor with tool-calling
- **[Best Buy API](https://developer.bestbuy.com/)** - Product pricing data
- **[Serper API](https://serper.dev/)** - Google Shopping results
- **[Walmart API](https://developer.walmart.com/)** - (Optional) Walmart pricing

### **DevOps**
- **[Node-cron](https://www.npmjs.com/package/node-cron)** - Scheduled price updates
- **[Zod](https://zod.dev/)** - Runtime type validation
- **[ESLint](https://eslint.org/)** - Code linting

---

## 🏗️ Architecture

### **Design Patterns**

#### **Strategy Pattern** (Price Fetchers)
```typescript
interface PriceFetcher {
  name: string;
  search(query: string): Promise<PriceResult[]>;
}

// Easily add new retailers without modifying existing code
class BestBuyFetcher implements PriceFetcher { ... }
class SerperFetcher implements PriceFetcher { ... }
```

#### **Tool-Calling Agent** (AI Advisor)
```typescript
// OpenAI function calling for dynamic tool use
const tools = [
  { name: "get_seasonal_sales", ... },
  { name: "calculate_affordability", ... }
];

// Multi-turn conversation with memory
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: conversationHistory,
  tools: tools
});
```

#### **Repository Pattern** (Data Access)
All database operations are abstracted through Prisma, making it easy to swap databases or add caching layers.

### **Data Flow**

```
User Query → API Route → Price Fetchers → Database
                ↓
          AI Advisor (with tools)
                ↓
     Unified Results (Prices + Affordability + AI Advice)
```

---

## 📦 Installation

### **Prerequisites**
- **Node.js** 20.x or higher
- **npm** or **yarn** or **pnpm**
- API keys (see [Configuration](#-configuration))

### **Step 1: Clone the Repository**
```bash
git clone https://github.com/Vishnuvemula99/pricewise.git
cd pricewise
```

### **Step 2: Install Dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

### **Step 3: Set Up Environment Variables**
```bash
cp .env.example .env
```

Edit `.env` and add your API keys (see [Configuration](#-configuration) for details).

### **Step 4: Initialize Database**
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with sample data
npm run db:seed
```

### **Step 5: Run Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Configuration

### **Environment Variables**

Create a `.env` file in the root directory with the following variables:

```bash
# ─── Database ────────────────────────────────────────────────
DATABASE_URL="file:./dev.db"

# ─── Price Data APIs ─────────────────────────────────────────
# Best Buy API - https://developer.bestbuy.com/
BESTBUY_API_KEY="your_bestbuy_api_key"

# Serper API (Google Shopping) - https://serper.dev/
SERPER_API_KEY="your_serper_api_key"

# Walmart API (Optional) - https://developer.walmart.com/
WALMART_API_KEY="your_walmart_api_key"

# ─── AI (OpenAI) ─────────────────────────────────────────────
# OpenAI API - https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-..."

# ─── App Configuration ───────────────────────────────────────
NEXT_PUBLIC_APP_NAME="PriceWise"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### **Getting API Keys**

#### **1. OpenAI API Key** (Required)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Create a new secret key
5. Copy and paste into `.env` as `OPENAI_API_KEY`

#### **2. Best Buy API Key** (Recommended)
1. Visit [Best Buy Developer Portal](https://developer.bestbuy.com/)
2. Create an account
3. Register a new application
4. Copy your API key to `.env` as `BESTBUY_API_KEY`

#### **3. Serper API Key** (Recommended)
1. Go to [Serper.dev](https://serper.dev/)
2. Sign up for a free account (2,500 free searches/month)
3. Copy your API key to `.env` as `SERPER_API_KEY`

#### **4. Walmart API Key** (Optional)
1. Visit [Walmart Developer Portal](https://developer.walmart.com/)
2. Apply for API access
3. Add to `.env` as `WALMART_API_KEY`

> **Note:** The app will work with just OpenAI + one price API (Best Buy or Serper). More APIs = more comprehensive price comparison.

---

## 🚀 Usage

### **Basic Search**
1. Enter a product name (e.g., "AirPods Pro", "MacBook Air M2")
2. Get instant results with:
   - Prices from multiple retailers
   - Affordability analysis
   - AI buy/wait recommendation

### **Ask Questions**
You can also ask natural language questions:
- "Should I buy a PS5 now?"
- "Is this a good price for iPhone 15?"
- "When do laptops usually go on sale?"

### **Follow-Up Conversations**
After getting results, ask follow-up questions:
- "Which retailer should I choose?"
- "Can you share the Best Buy link?"
- "How does this compare to Black Friday prices?"

### **Set Up Your Budget Profile**
1. On first visit, you'll see an onboarding modal
2. Enter your monthly income and savings rate
3. Get personalized affordability calculations
4. Update anytime in **Settings**

### **Create Price Alerts**
1. Search for a product
2. Go to product detail page
3. Set your target price
4. Get notified when price drops

### **View Dashboard**
Navigate to `/dashboard` to see:
- Tracked products
- Active price alerts
- Recent searches
- Trending products

---

## 📚 API Reference

### **Search Products**
```http
GET /api/search?q={query}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "AirPods Pro",
    "category": "headphones",
    "prices": [
      {
        "retailer": "bestbuy",
        "price": 199.99,
        "url": "https://...",
        "inStock": true
      }
    ],
    "lowestPrice": 199.99,
    "highestPrice": 249.99,
    "averagePrice": 224.99,
    "retailerCount": 3
  }
}
```

### **Get AI Recommendation**
```http
POST /api/advisor
Content-Type: application/json

{
  "query": "Should I buy AirPods Pro now?",
  "productName": "AirPods Pro",
  "conversationHistory": []
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Based on seasonal trends...",
    "conversationHistory": [...]
  }
}
```

### **Calculate Affordability**
```http
POST /api/budget
Content-Type: application/json

{
  "productName": "MacBook Air",
  "price": 1199,
  "monthlyIncome": 5000,
  "savingsRate": 0.2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hourlyRate": 28.85,
    "workTimeHours": 41.56,
    "workTimeDisplay": "5 days, 1 hour",
    "percentOfMonthlyIncome": 23.98,
    "affordabilityTier": "moderate",
    "weeksToAfford": 1.2,
    "monthsToAfford": 0.3,
    "suggestion": "This purchase requires about 24% of your monthly income..."
  }
}
```

### **Create Price Alert**
```http
POST /api/alerts
Content-Type: application/json

{
  "productId": "clx123...",
  "targetPrice": 199.99
}
```

### **Get Price History**
```http
GET /api/history?productName={name}
```

### **Get Trending Products**
```http
GET /api/trending
```

---

## 🗄️ Database Schema

### **Core Models**

#### **Product**
```prisma
model Product {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  category    String
  imageUrl    String?
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  prices      PriceRecord[]
  alerts      PriceAlert[]
  searches    SearchLog[]
}
```

#### **PriceRecord**
```prisma
model PriceRecord {
  id        String   @id @default(cuid())
  productId String
  retailer  String
  price     Float
  currency  String   @default("USD")
  url       String?
  inStock   Boolean  @default(true)
  fetchedAt DateTime @default(now())
  
  product   Product  @relation(...)
}
```

#### **PriceAlert**
```prisma
model PriceAlert {
  id          String   @id @default(cuid())
  productId   String
  targetPrice Float
  isActive    Boolean  @default(true)
  triggeredAt DateTime?
  createdAt   DateTime @default(now())
  
  product     Product  @relation(...)
}
```

#### **BudgetProfile**
```prisma
model BudgetProfile {
  id                  String   @id @default(cuid())
  monthlyIncome       Float
  monthlySavingsRate  Float    @default(0.2)
  currency            String   @default("USD")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

#### **SeasonalTrend**
```prisma
model SeasonalTrend {
  id             String @id @default(cuid())
  category       String
  event          String
  typicalMonth   Int
  avgDiscountPct Float
  confidence     Float  @default(0.7)
  source         String @default("manual")
  notes          String?
}
```

---

## 📁 Project Structure

```
pricewise/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed data script
├── scripts/
│   └── fetch-prices.ts        # Cron job for price updates
├── src/
│   └── app/
│       ├── api/               # API routes
│       │   ├── advisor/       # AI recommendation endpoint
│       │   ├── alerts/        # Price alerts CRUD
│       │   ├── budget/        # Affordability calculator
│       │   ├── history/       # Price history
│       │   ├── products/      # Product details
│       │   ├── profile/       # User budget profile
│       │   ├── search/        # Product search
│       │   └── trending/      # Trending products
│       ├── components/        # React components
│       │   ├── advisor/       # AI chat components
│       │   ├── alerts/        # Alert management
│       │   ├── budget/        # Budget panels
│       │   ├── charts/        # Price history charts
│       │   ├── onboarding/    # User onboarding
│       │   ├── price/         # Price cards
│       │   └── ui/            # Shared UI components
│       ├── lib/               # Utilities & business logic
│       │   ├── ai/            # AI advisor logic
│       │   ├── db/            # Prisma client
│       │   ├── fetchers/      # Price fetcher strategies
│       │   └── utils/         # Helper functions
│       ├── types/             # TypeScript type definitions
│       ├── dashboard/         # Dashboard page
│       ├── product/[slug]/    # Product detail page
│       ├── settings/          # Settings page
│       ├── layout.tsx         # Root layout
│       ├── page.tsx           # Home page
│       └── globals.css        # Global styles
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── next.config.js             # Next.js configuration
├── package.json               # Dependencies
├── tailwind.config.ts         # Tailwind configuration
└── tsconfig.json              # TypeScript configuration
```

---

## 🚢 Deployment

### **Vercel (Recommended)**

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com/)
3. Import your repository
4. Add environment variables in Vercel dashboard
5. Deploy!

**Database:** For production, switch from SQLite to PostgreSQL:
```bash
# Update DATABASE_URL in Vercel environment variables
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

### **Other Platforms**

- **Netlify:** Supports Next.js with Edge Functions
- **Railway:** Easy PostgreSQL + Next.js deployment
- **Render:** Free tier available with PostgreSQL
- **AWS Amplify:** Full-stack deployment

### **Cron Jobs**

For automated price updates, set up a cron job:

**Vercel Cron:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/alerts/check",
    "schedule": "0 */6 * * *"
  }]
}
```

**Or use external services:**
- [Cron-job.org](https://cron-job.org/)
- [EasyCron](https://www.easycron.com/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### **Reporting Bugs**
Open an issue with:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)

### **Feature Requests**
Open an issue with:
- Clear description of the feature
- Use case and benefits
- Proposed implementation (optional)

### **Pull Requests**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**
- Follow existing code style
- Add TypeScript types for all new code
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** for GPT-4o-mini API
- **Best Buy** for product pricing API
- **Serper** for Google Shopping integration
- **Vercel** for Next.js framework and hosting
- **Prisma** for the amazing ORM

---

## 📧 Contact

**Vishnu Vemula**
- GitHub: [@Vishnuvemula99](https://github.com/Vishnuvemula99)
- Email: vemulavishnu41@gmail.com

---

## 🌟 Star History

If you find this project helpful, please consider giving it a ⭐️!

---

<div align="center">

**Built with ❤️ using Next.js, TypeScript, and OpenAI**

[⬆ Back to Top](#️-pricewise)

</div>
