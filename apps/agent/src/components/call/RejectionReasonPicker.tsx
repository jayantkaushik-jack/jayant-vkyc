import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ReasonDecisionClass, SelectedRejectionReasons } from '@vkyc/shared/lib/rejectionReasons';
import { REJECTION_REASONS } from '@vkyc/shared/lib/rejectionReasons';

interface RejectionReasonPickerProps {
  selected: SelectedRejectionReasons;
  onChange: (next: SelectedRejectionReasons) => void;
  remarksPlaceholder?: string;
  decisionFilter?: 'all' | Exclude<ReasonDecisionClass, 'dropped'>;
}

export function RejectionReasonPicker({
  selected,
  onChange,
  remarksPlaceholder = 'Add Remarks (optional)',
  decisionFilter = 'all',
}: RejectionReasonPickerProps) {
  const categories = Array.from(
    REJECTION_REASONS
      .filter((r) => r.decision !== 'dropped' && (decisionFilter === 'all' || r.decision === decisionFilter))
      .reduce((map, row) => {
        const existing = map.get(row.categoryId) ?? { id: row.categoryId, label: row.category, reasons: [] as string[] };
        existing.reasons.push(row.label);
        map.set(row.categoryId, existing);
        return map;
      }, new Map<string, { id: string; label: string; reasons: string[] }>()).values(),
  );
  const [openCategory, setOpenCategory] = useState<string | null>(categories[0]?.id ?? null);

  const toggleReason = (categoryLabel: string, reason: string) => {
    const existing = selected.selections.find((s) => s.category === categoryLabel);
    let nextSelections = [...selected.selections];

    if (existing) {
      const has = existing.reasons.includes(reason);
      const newReasons = has
        ? existing.reasons.filter((r) => r !== reason)
        : [...existing.reasons, reason];
      if (newReasons.length === 0) {
        nextSelections = nextSelections.filter((s) => s.category !== categoryLabel);
      } else {
        nextSelections = nextSelections.map((s) =>
          s.category === categoryLabel ? { ...s, reasons: newReasons } : s,
        );
      }
    } else {
      nextSelections.push({ category: categoryLabel, reasons: [reason] });
    }

    onChange({ ...selected, selections: nextSelections });
  };

  const isChecked = (categoryLabel: string, reason: string) =>
    selected.selections.some((s) => s.category === categoryLabel && s.reasons.includes(reason));

  return (
    <div className="space-y-3 max-h-[360px] overflow-y-auto">
      {categories.map((cat) => {
        const isOpen = openCategory === cat.id;
        return (
          <div key={cat.id} className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-primary-soft/50"
              onClick={() => setOpenCategory(isOpen ? null : cat.id)}
            >
              {cat.label}
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isOpen && (
              <div className="px-4 pb-3 space-y-2 border-t border-border">
                {cat.reasons.map((reason) => (
                  <label key={reason} className="flex items-start gap-2 text-sm cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={isChecked(cat.label, reason)}
                      onChange={() => toggleReason(cat.label, reason)}
                      className="mt-0.5 rounded text-primary"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <textarea
        value={selected.remarks}
        onChange={(e) => onChange({ ...selected, remarks: e.target.value })}
        placeholder={remarksPlaceholder}
        className="w-full px-3 py-2 rounded-lg border border-border text-sm h-20 resize-none"
      />
    </div>
  );
}

export function hasRejectionSelection(selected: SelectedRejectionReasons): boolean {
  return selected.selections.some((s) => s.reasons.length > 0);
}
