
// export const publicRoutes: string[]  = ['/', '/about', '/products'];
export const publicRoutes: string[] = [
  '/',
  '/about',
  '/products',
  '/dashboard',
  '/checkout',        // ← add this
  '/orders',
  '/affiliate/onboarding',  // ← add this
  '/vendor/onboarding',     // ← add this if not already there
];
export const authRoutes: string[]    = ['/login', '/register', '/forgot-password'];
export const apiAuthPrefix: string   = '/api/auth';
export const DEFAULT_LOGIN_REDIRECT: string = '/dashboard';



// **Commit message:**
// ```
// feat(affiliate): add affiliate onboarding wizard
//
// - 4-step onboarding: personal info, KYC identity, payout setup, review
// - Supports M-Pesa and bank transfer payout methods
// - Kenyan bank selector for bank transfer option
// - ID number collected for KYC (admin-only, not public)
// - Auto-generates affiliate token on completion
// - Creates balance record on signup
// - Live earnings estimator on left panel
// - Confetti launch animation on completion
// - Redirects to /affiliate dashboard after setup
//

// export const publicRoutes: string[]          = ['/', '/about', '/products'];
// export const authRoutes: string[]            = ['/login', '/register', '/forgot-password'];
// export const apiAuthPrefix: string           = '/api/auth';
// export const DEFAULT_LOGIN_REDIRECT: string  = '/dashboard';


