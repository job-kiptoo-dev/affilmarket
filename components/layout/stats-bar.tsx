export function StatsBar() {
  const stats = [
    { value: '10,000+', label: 'Products Listed' },
    { value: '2,500+', label: 'Active Affiliates' },
    { value: '500+', label: 'Verified Vendors' },
    { value: 'KES 50M+', label: 'Commissions Paid' },
  ];

  return (
    <div className="bg-white border-y border-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
