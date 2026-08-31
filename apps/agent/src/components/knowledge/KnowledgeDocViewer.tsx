import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@agent/components/ui/Card';
import { KnowledgeMarkdown, slugFromHeading } from '@vkyc/shared/lib/knowledgeMarkdown';
import { cn } from '@vkyc/shared/lib/cn';
import type { KnowledgeDocSection } from '@vkyc/shared/data/knowledgeDocs';
import type { LucideIcon } from 'lucide-react';

export interface KnowledgeDocViewModel {
  id: string;
  title: string;
  icon: LucideIcon;
  updatedDaysAgo: number;
  sections: KnowledgeDocSection[];
}

export function KnowledgeDocViewer({
  doc,
  backHref,
  backLabel = 'Knowledge Center',
}: {
  doc: KnowledgeDocViewModel;
  backHref: string;
  backLabel?: string;
}) {
  const sectionIds = useMemo(
    () => doc.sections.map((s) => slugFromHeading(s.heading)),
    [doc.sections],
  );
  const [activeId, setActiveId] = useState(sectionIds[0] ?? '');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current?.disconnect();
    const visible = new Map<string, IntersectionObserverEntry>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.set(entry.target.id, entry);
          else visible.delete(entry.target.id);
        });
        if (visible.size === 0) return;
        const top = [...visible.values()].sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        )[0];
        if (top?.target.id) setActiveId(top.target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [sectionIds]);

  const Icon = doc.icon;

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto print:p-0 print:max-w-none">
      <Link
        to={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-6 print:hidden"
      >
        ← {backLabel}
      </Link>

      <div className="flex gap-8 items-start">
        <article className="flex-1 min-w-0 space-y-4 print:space-y-3">
          <header className="mb-2 print:mb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary-soft text-primary print:bg-transparent print:p-0">
                <Icon size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold print:text-xl">{doc.title}</h1>
                <p className="text-sm text-text-muted mt-1">Updated {doc.updatedDaysAgo} days ago</p>
              </div>
            </div>
          </header>

          {doc.sections.map((section) => {
            const id = slugFromHeading(section.heading);
            return (
              <div key={id} id={id} className="scroll-mt-24">
                <Card className="print:shadow-none print:border-border/80 print:break-inside-avoid">
                  <h2 className="font-semibold text-base mb-3">{section.heading}</h2>
                  <KnowledgeMarkdown body={section.body} />
                </Card>
              </div>
            );
          })}
        </article>

        <nav
          aria-label="Table of contents"
          className="hidden lg:block w-56 shrink-0 print:hidden"
        >
          <div className="sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-3">
              On this page
            </p>
            <ul className="space-y-1 border-l border-border">
              {doc.sections.map((section) => {
                const id = slugFromHeading(section.heading);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => scrollToSection(id)}
                      className={cn(
                        'block w-full text-left text-xs py-1.5 pl-3 -ml-px border-l-2 transition-colors leading-snug',
                        activeId === id
                          ? 'border-primary text-primary font-medium'
                          : 'border-transparent text-text-muted hover:text-text hover:border-border',
                      )}
                    >
                      {section.heading.replace(/^\d+\.\s*/, '')}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
}
