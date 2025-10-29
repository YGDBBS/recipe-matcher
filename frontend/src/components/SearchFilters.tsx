import { Search } from 'lucide-react';

export const cuisines = ['Mediterranean', 'Italian', 'Indian', 'Mexican', 'Chinese', 'Japanese', 'Thai', 'French'];

interface SearchFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  cuisine: string;
  setCuisine: (value: string) => void;
  onReset: () => void;
}

export default function SearchFilters({ search, setSearch, cuisine, setCuisine, onReset }: SearchFiltersProps) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Search by ingredient (e.g. chicken)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-4 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all duration-200"
          />
        </div>
        <select
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
          className="px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-4 focus:ring-[#84CC16]/30 focus:border-[#84CC16] transition-all duration-200"
        >
          <option value="">All cuisines</option>
          {cuisines.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={onReset}
          className="text-[#84CC16] hover:text-[#65A30D] hover:underline transition-all duration-200"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

