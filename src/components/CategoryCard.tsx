import Link from "next/link";
import {
  Cpu,
  Palette,
  HeartPulse,
  Scale,
  Mountain,
  Footprints,
  Briefcase,
  Crown,
  Target,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  cpu: Cpu,
  palette: Palette,
  "heart-pulse": HeartPulse,
  scale: Scale,
  mountain: Mountain,
  footprints: Footprints,
  briefcase: Briefcase,
  crown: Crown,
  target: Target,
};

interface CategoryCardProps {
  id: number;
  name: string;
  description: string | null;
  moderator_name: string | null;
  icon: string | null;
  color: string | null;
  post_count?: number;
}

export default function CategoryCard({
  id,
  name,
  description,
  moderator_name,
  icon,
  color,
  post_count = 0,
}: CategoryCardProps) {
  const IconComponent = icon ? iconMap[icon] : null;
  const categoryColor = color || "#8B6F47";

  return (
    <Link href={`/community/${id}`} className="block group">
      <div className="card overflow-hidden h-full">
        {/* Color bar */}
        <div className="h-1.5" style={{ backgroundColor: categoryColor }} />

        <div className="p-5">
          {/* Icon + Title */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${categoryColor}15` }}
            >
              {IconComponent ? (
                <IconComponent size={20} className="opacity-80" style={{ color: categoryColor }} />
              ) : (
                <span className="text-lg">📁</span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-semibold text-base text-text-primary group-hover:text-primary transition-colors truncate">
                {name}
              </h3>
              {moderator_name && (
                <p className="text-xs text-text-muted mt-0.5">
                  主理人：{moderator_name}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-text-secondary leading-relaxed mb-3 line-clamp-2">
              {description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-text-muted pt-3 border-t border-border-light">
            <span>{post_count} 篇帖子</span>
            <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              进入板块 →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
