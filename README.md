# AffilMarket Kenya 🇰🇪

**Kenya's Multi-Sided Affiliate Marketplace**
Connecting Vendors, Affiliates, and Customers — Powered by M-Pesa

---

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) v1.0+
- PostgreSQL (via Supabase)
- Node.js 18+ (for Prisma tools)

### 1. Clone & Install
```bash
git clone https://github.com/your-org/affilmarket.git
cd affilmarket
bun install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 3. Database Setup
```bash
# Push schema to Supabase
bun run db:push

# Generate Prisma client
bun run db:generate

# Seed with demo data
bun run db:seed
```

### 4. Start Development
```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Architecture

```
affilmarket/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Login, Register pages
│   ├── (dashboard)/            # Protected dashboards
│   │   ├── vendor/             # Vendor portal
│   │   ├── affiliate/          # Affiliate portal
│   │   └── admin/              # Admin panel
│   ├── api/                    # REST API routes
│   │   ├── auth/               # Auth endpoints
│   │   ├── products/           # Product CRUD
│   │   ├── orders/             # Order management
│   │   ├── vendor/             # Vendor-specific APIs
│   │   ├── affiliate/          # Affiliate APIs
│   │   ├── admin/              # Admin APIs
│   │   └── webhooks/mpesa/     # M-Pesa callbacks
│   └── products/               # Public product pages
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/                 # Navbar, Footer, Hero
│   ├── products/               # Product cards, grids
│   ├── dashboard/              # Dashboard shells, tables
│   └── charts/                 # Recharts wrappers
├── lib/
│   ├── prisma.ts               # Prisma client
│   ├── auth.ts                 # JWT utilities
│   ├── mpesa.ts                # M-Pesa Daraja API
│   ├── commission.ts           # Commission engine
│   ├── schemas.ts              # Zod validation
│   └── utils.ts                # Helpers
├── prisma/
│   ├── schema.prisma           # Full database schema
│   └── seed.ts                 # Demo data seeder
├── store/
│   └── auth.ts                 # Zustand auth store
└── middleware.ts               # Route protection
```

---

## 🔑 Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@affilmarket.co.ke | Admin@AffilMarket2026! |
| Vendor | vendor@demo.co.ke | Vendor@Demo123! |
| Affiliate | affiliate@demo.co.ke | Affiliate@Demo123! |

---

## 💳 M-Pesa Integration (Daraja API)

### Setup
1. Register at [Safaricom Developer Portal](https://developer.safaricom.co.ke)
2. Create an app → get Consumer Key & Secret
3. Get your Lipa Na M-Pesa passkey from the sandbox
4. Fill in `.env.local`:

```env
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379  # Sandbox shortcode
MPESA_ENVIRONMENT=sandbox
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/webhooks/mpesa/callback
```

### Expose Callback (Development)
```bash
# Install ngrok
npx ngrok http 3000
# Copy the HTTPS URL to MPESA_CALLBACK_URL
```

### M-Pesa Flow
1. Customer enters phone + clicks Pay
2. `POST /api/orders` → STK Push sent to phone
3. Customer enters M-Pesa PIN
4. Safaricom calls `POST /api/webhooks/mpesa/callback`
5. Commission engine runs, balances updated
6. Order confirmed ✅

---

## 🗄️ Database Schema

Key tables:
- **users** — All platform users with roles (VENDOR/AFFILIATE/BOTH/ADMIN)
- **vendor_profiles** — Shop details, KYC, approval status
- **affiliate_profiles** — Affiliate tokens, payout details
- **products** — Product catalog with per-product commission rates
- **orders** — Orders with immutable commission breakdown
- **mpesa_transactions** — STK push tracking
- **affiliate_clicks** — Click tracking with cookie support
- **balances** — Pending/available/paid balances per user
- **payout_requests** — Withdrawal requests

---

## 💰 Commission Engine

### Formula (Case A — With Affiliate)
```
platform_fee = total_amount × platform_fee_rate + platform_fixed_fee
affiliate_commission = total_amount × product_commission_rate
vendor_earnings = total_amount - platform_fee - affiliate_commission
```

### Formula (Case B — No Affiliate)
```
platform_fee = total_amount × platform_fee_rate + platform_fixed_fee
platform_extra = total_amount × product_commission_rate  ← platform keeps this
vendor_earnings = total_amount - platform_fee - platform_extra
```

Commissions are computed **once**, stored **immutably** on the order record, and only triggered after webhook verification.

---

## 🛡️ Security

- JWT in HttpOnly cookies (not localStorage)
- bcrypt password hashing (cost 12)
- Zod validation on all API endpoints
- M-Pesa callback parsing with error isolation
- Role-based route protection via middleware
- Supabase Row Level Security (RLS) ready

---

## 📱 API Endpoints

### Auth
```
POST /api/auth/register   — Create account
POST /api/auth/login      — Login
POST /api/auth/logout     — Logout
GET  /api/auth/me         — Current user
```

### Products (Public)
```
GET  /api/products        — List products (search, filter, paginate)
GET  /api/products/[id]   — Product detail
```

### Orders
```
POST /api/orders          — Create order + initiate STK Push
GET  /api/orders/[id]/poll — Poll payment status
```

### Webhooks
```
POST /api/webhooks/mpesa/callback — M-Pesa payment callback
```

---

## 🚢 Deployment

### Railway (Recommended for MVP)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Add all `.env.local` values to Railway environment variables.

### Production Checklist
- [ ] Switch MPESA_ENVIRONMENT to `production`
- [ ] Set MPESA_BASE_URL to `https://api.safaricom.co.ke`
- [ ] Enable Supabase daily backups
- [ ] Set NEXT_PUBLIC_APP_URL to your domain
- [ ] Run full E2E test with real M-Pesa
- [ ] Complete Flutterwave/M-Pesa KYC for live mode

---

## 📅 Development Phases

| Phase | Timeline | Status |
|-------|----------|--------|
| 1. Foundation & Auth | Week 1-2 | ✅ Built |
| 2. Product & Catalog | Week 3-4 | 🔄 In Progress |
| 3. Checkout & Payments | Week 5-7 | ✅ Built |
| 4. Affiliate System | Week 8-9 | ✅ Built |
| 5. Dashboards | Week 10-12 | ✅ Built |
| 6. Payouts, KYC & Fraud | Week 13-14 | 🔄 Pending |
| 7. Testing & Launch | Week 15-16 | 🔄 Pending |

---

#issue  
https://affilmarket.vercel.app/affiliate/products/set-iron-pot?aff=DEMO_JANE_2026

*AffilMarket Kenya v0.1.0 — March 2026 | Confidential*
