import React from 'react';

export type SectionInput = {
  label: string;
  placeholder?: string;
  type?: 'text' | 'number';
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export interface SectionCardProps {
  title: string;
  inputs: SectionInput[];
  onSubmit?: () => void;
  submitLabel?: string;
}

export default function SectionCard({ title, inputs, onSubmit, submitLabel = 'Save' }: SectionCardProps) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-6">
      <h3 className="text-xl font-bold text-[#1F2937] mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {inputs.map((field, idx) => (
          <div key={idx}>
            <label className="block text-sm font-medium text-[#1F2937] mb-1">{field.label}</label>
            <input
              type={field.type || 'text'}
              placeholder={field.placeholder}
              value={field.value}
              onChange={field.onChange}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
            />
          </div>
        ))}
      </div>
      {onSubmit && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onSubmit}
            className="bg-[#84CC16] hover:bg-[#65A30D] text-white px-4 py-2 rounded-xl text-sm font-medium"
          >
            {submitLabel}
          </button>
        </div>
      )}
    </div>
  );
}


