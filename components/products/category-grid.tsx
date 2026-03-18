import Link from 'next/link';

interface CategoryGridProps {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    _count: { products: number };
  }>;
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  console.log("this are my categories", categories);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/products?category=${cat.slug}`}
          className="group flex flex-col items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 hover:border-brand-green hover:shadow-md transition-all text-center card-hover"
        >
          <div className="text-3xl">{cat.icon || '📦'}</div>
          <div>
            <p className="font-semibold text-gray-900 text-sm group-hover:text-brand-green transition-colors">
              {cat.name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{cat._count.products} products</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
