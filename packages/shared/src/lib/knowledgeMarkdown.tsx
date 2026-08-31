import { Fragment } from 'react';
import { cn } from './cn';

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith('|') && line.trim().endsWith('|');
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

export function KnowledgeMarkdown({ body, className }: { body: string; className?: string }) {
  const lines = body.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headerCells = parseTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-gray-50/80">
                {headerCells.map((cell, ci) => (
                  <th key={ci} className="text-left px-3 py-2 font-semibold text-text">
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/60">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 align-top text-text">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^-\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-5 space-y-1.5 my-3">
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push(
        <ol key={key++} className="list-decimal pl-5 space-y-1.5 my-3">
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !/^-\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i]) && !isTableRow(lines[i])) {
      paragraphLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-3 leading-relaxed">
        {renderInline(paragraphLines.join(' '))}
      </p>,
    );
  }

  return (
    <div className={cn('text-sm text-text [&>p:first-child]:mt-0 [&>*:last-child]:mb-0', className)}>
      {blocks}
    </div>
  );
}

export function slugFromHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
