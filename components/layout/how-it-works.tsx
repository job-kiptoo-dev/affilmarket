export function HowItWorks() {
  const steps = {
    vendors: [
      { step: '01', title: 'List Your Products', desc: 'Upload products with photos, pricing, and commission rates for affiliates.' },
      { step: '02', title: 'Get Approved', desc: 'Our team reviews your shop. Approval typically takes under 24 hours.' },
      { step: '03', title: 'Affiliates Promote You', desc: 'Affiliates share your products and drive customers your way.' },
      { step: '04', title: 'Get Paid via M-Pesa', desc: 'Earnings are released after delivery. Withdraw to M-Pesa anytime.' },
    ],
    affiliates: [
      { step: '01', title: 'Sign Up Free', desc: 'Create your affiliate account in under 2 minutes.' },
      { step: '02', title: 'Pick Products', desc: 'Browse all active products and choose ones your audience will love.' },
      { step: '03', title: 'Share Your Links', desc: 'Share unique affiliate links on social media, WhatsApp, or your blog.' },
      { step: '04', title: 'Earn Commissions', desc: 'Earn up to 30% on every sale you refer, paid directly to M-Pesa.' },
    ],
  };

  return (
    <section className="py-20 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">How AffilMarket Works</h2>
        <p className="text-gray-500 max-w-lg mx-auto">
          Whether you're selling products or promoting them, getting started takes minutes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Vendor Steps */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 brand-gradient rounded-lg flex items-center justify-center text-white text-sm font-bold">V</div>
            <h3 className="text-xl font-bold text-gray-900">For Vendors</h3>
          </div>
          <div className="space-y-6">
            {steps.vendors.map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-green-light text-brand-green font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">{s.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Affiliate Steps */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">A</div>
            <h3 className="text-xl font-bold text-gray-900">For Affiliates</h3>
          </div>
          <div className="space-y-6">
            {steps.affiliates.map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">{s.title}</h4>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
