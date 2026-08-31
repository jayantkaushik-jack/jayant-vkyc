import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@agent/components/ui/Card';

export interface KnowledgeDocMeta {
  id: string;
  title: string;
  icon: LucideIcon;
  updatedDaysAgo: number;
}

export function KnowledgeCenterGrid({
  docs,
  basePath,
}: {
  docs: KnowledgeDocMeta[];
  basePath: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {docs.map(({ id, title, icon: Icon, updatedDaysAgo }) => (
        <Link key={id} to={`${basePath}/${id}`} className="text-left">
          <Card className="hover:border-primary/30 transition-colors h-full">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary-soft text-primary">
                <Icon size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{title}</h3>
                <p className="text-xs text-text-muted mt-1">Updated {updatedDaysAgo} days ago</p>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
