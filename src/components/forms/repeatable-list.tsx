"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type RepeatableListProps<T extends { id: string }> = {
  items: T[];
  addLabel: string;
  emptyText: string;
  itemTitle: (index: number) => string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  maxItems?: number;
};

/** Generic add/remove list used for children and phone numbers. */
export function RepeatableList<T extends { id: string }>({
  items,
  addLabel,
  emptyText,
  itemTitle,
  onAdd,
  onRemove,
  renderItem,
  maxItems = 30,
}: RepeatableListProps<T>) {
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      )}
      {items.map((item, index) => (
        <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">{itemTitle(index)}</span>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-3.5" aria-hidden />
              حذف
            </button>
          </div>
          {renderItem(item, index)}
        </div>
      ))}
      {items.length < maxItems && (
        <Button variant="outline" onClick={onAdd} className="w-full border-dashed sm:w-auto">
          <Plus className="size-4" aria-hidden />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
