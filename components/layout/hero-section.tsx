

import Image from 'next/image';
import Link from 'next/link';
import { Search, ArrowRight, Star, ShieldCheck, Zap } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden text-white min-h-[600px]">
      
      {/* Background Image - quality set to 100, sizes optimized */}
      <Image
        src="https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YWZmaWxpYXRlJTIwbWFya2V0aW5nfGVufDB8fDB8fHww"
        alt="Hero background"
        fill
        quality={100}
        sizes="100vw"
        className="object-cover object-center"
        priority
      />

      {/* Lighter overlay - reduce opacity to let image breathe */}
      <div className="absolute inset-0 bg-green-950/50" />

      {/* Lighter gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-950/40 via-transparent to-emerald-800/30" />

      {/* Background decoration blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-green-400/5 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 lg:py-28">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>Kenya's #1 Affiliate Marketplace</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Sell More. Earn More.
            <br />
            <span className="text-amber-400">Pay with M-Pesa.</span>
          </h1>

          <p className="text-lg lg:text-xl text-green-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect vendors, affiliates, and customers in Kenya's fastest-growing affiliate marketplace.
            List products, share links, and get paid instantly via M-Pesa.
          </p>

          {/* Search Bar */}
          <div className="flex items-center gap-2 bg-white rounded-2xl p-2 mb-8 max-w-xl mx-auto shadow-2xl">
            <Search className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search products, categories..."
              className="flex-1 text-gray-900 placeholder-gray-400 outline-none text-sm"
            />
            <Link
              href="/products"
              className="bg-brand-green text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-green-dark transition-colors flex items-center gap-1"
            >
              Search <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/register?role=VENDOR"
              className="bg-white text-green-900 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors"
            >
              Start Selling Free
            </Link>
            <Link
              href="/products"
              className="border border-white/30 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              Browse Products
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-8 mt-12 flex-wrap">
            <div className="flex items-center gap-2 text-green-200 text-sm">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              Secure M-Pesa payments
            </div>
            <div className="flex items-center gap-2 text-green-200 text-sm">
              <Star className="w-4 h-4 text-amber-400" />
              Verified vendors only
            </div>
            <div className="flex items-center gap-2 text-green-200 text-sm">
              <Zap className="w-4 h-4 text-yellow-400" />
              Instant commission payouts
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



// import Image from 'next/image';
// import Link from 'next/link';
// import { Search, ArrowRight, Star, ShieldCheck, Zap } from 'lucide-react';
//
// export function HeroSection() {
//   return (
//     <section className="relative overflow-hidden text-white min-h-[600px]">
//
//       {/* Background Image */}
//       <Image
//         src="https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YWZmaWxpYXRlJTIwbWFya2V0aW5nfGVufDB8fDB8fHww" // 👈 update this path
//        alt="Hero background"
//         fill
//         quality={100}
//         sizes="100vw"
//         className="object-cover object-center"
//         priority
//         />
//
//       {/* Dark overlay so text stays readable */}
//       <div className="absolute inset-0 bg-green-750 bg-opacity-0" />
//
//       {/* Subtle gradient on top of image */}
//       <div className="absolute inset-0 bg-gradient-to-br from-green-950/60 via-green-900/40 to-emerald-800/50" />
//
//       {/* Background decoration blobs */}
//       <div className="absolute inset-0 overflow-hidden pointer-events-none">
//         <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
//         <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
//         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-green-400/5 blur-3xl" />
//       </div>
//
//       {/* Content */}
//       <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 lg:py-28">
//         <div className="max-w-3xl mx-auto text-center">
//           {/* Badge */}
//           <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm mb-8">
//             <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
//             <span>Kenya's #1 Affiliate Marketplace</span>
//           </div>
//
//           <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
//             Sell More. Earn More.
//             <br />
//             <span className="text-amber-400">Pay with M-Pesa.</span>
//           </h1>
//
//           <p className="text-lg lg:text-xl text-green-100 mb-10 max-w-2xl mx-auto leading-relaxed">
//             Connect vendors, affiliates, and customers in Kenya's fastest-growing affiliate marketplace.
//             List products, share links, and get paid instantly via M-Pesa.
//           </p>
//
//           {/* Search Bar */}
//           <div className="flex items-center gap-2 bg-white rounded-2xl p-2 mb-8 max-w-xl mx-auto shadow-2xl">
//             <Search className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" />
//             <input
//               type="text"
//               placeholder="Search products, categories..."
//               className="flex-1 text-gray-900 placeholder-gray-400 outline-none text-sm"
//             />
//             <Link
//               href="/products"
//               className="bg-brand-green text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-green-dark transition-colors flex items-center gap-1"
//             >
//               Search <ArrowRight className="w-4 h-4" />
//             </Link>
//           </div>
//
//           {/* CTA Buttons */}
//           <div className="flex items-center justify-center gap-4 flex-wrap">
//             <Link
//               href="/register?role=VENDOR"
//               className="bg-white text-green-900 px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition-colors"
//             >
//               Start Selling Free
//             </Link>
//             <Link
//               href="/products"
//               className="border border-white/30 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/10 transition-colors"
//             >
//               Browse Products
//             </Link>
//           </div>
//
//           {/* Trust indicators */}
//           <div className="flex items-center justify-center gap-8 mt-12 flex-wrap">
//             <div className="flex items-center gap-2 text-green-200 text-sm">
//               <ShieldCheck className="w-4 h-4 text-green-400" />
//               Secure M-Pesa payments
//             </div>
//             <div className="flex items-center gap-2 text-green-200 text-sm">
//               <Star className="w-4 h-4 text-amber-400" />
//               Verified vendors only
//             </div>
//             <div className="flex items-center gap-2 text-green-200 text-sm">
//               <Zap className="w-4 h-4 text-yellow-400" />
//               Instant commission payouts
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }
