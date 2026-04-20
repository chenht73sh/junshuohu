export const dynamic = "force-dynamic";

import { initializeDatabase } from "@/lib/db";
import CategoryCard from "@/components/CategoryCard";

interface CategoryRow {
  id: number;
  name: string;
  description: string | null;
  moderator_name: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  post_count: number;
}

export default async function CategoriesPage() {
  const db = await initializeDatabase();

  const result = await db.execute({
    sql: `SELECT c.*, 
      (SELECT COUNT(*) FROM posts WHERE category_id = c.id) as post_count
    FROM categories c
    ORDER BY c.sort_order ASC`,
    args: [],
  });
  const categories = result.rows as unknown as CategoryRow[];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold mb-3">
          社群板块
        </h1>
        <p className="text-text-secondary max-w-xl mx-auto">
          九大板块，九种精彩。每一个板块都由热爱它的主理人精心打理，
          找到你心之所向的那个角落吧。
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            id={cat.id}
            name={cat.name}
            description={cat.description}
            moderator_name={cat.moderator_name}
            icon={cat.icon}
            color={cat.color}
            post_count={cat.post_count}
          />
        ))}
      </div>
    </div>
  );
}
