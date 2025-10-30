// src/components/SectionCardSmall.tsx
import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  quantity: string;
}

interface SectionCardSmallProps {
  title: string;
  category: string;
  items: Item[];
  onRemove: (id: string) => void;
  onAdd: (name: string, quantity: number, category: string) => void;
}

export default function SectionCardSmall({ title, category, items, onRemove, onAdd }: SectionCardSmallProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), quantity || 1, category);
    setName('');
    setQuantity(1);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 h-full flex flex-col overflow-hidden">
      <h3 className="font-bold text-[#1F2937] mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-[#6B7280] text-sm italic">No items</p>
      ) : (
        <div className="space-y-2 flex-1 overflow-auto">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 bg-[#FFFBEB] rounded hover:bg-[#FFF7ED] transition"
            >
              <div>
                <div className="font-medium text-[#1F2937]">{item.name}</div>
                <div className="text-xs text-[#6B7280]">{item.quantity}</div>
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                aria-label="Remove"
                title="Remove"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inline add form */}
      <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 items-stretch">
        <input
          type="text"
          placeholder="Add ingredient..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="md:col-span-2 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
          required
        />
        <input
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
          className="px-3 py-1.5 text-sm border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm bg-[#84CC16] hover:bg-[#65A30D] text-white rounded w-full"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>
    </div>
  );
}