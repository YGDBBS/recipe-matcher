type Tab = 'all' | 'mine' | 'create' | 'pantry' | 'login';

interface TabsProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  isAuthenticated: boolean;
}

export default function Tabs({ active, onChange, isAuthenticated }: TabsProps) {
  return (
    <div className="bg-white border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => onChange('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
              active === 'all'
                ? 'border-[#F97316] text-[#F97316]'
                : 'border-transparent text-[#6B7280] hover:text-[#F97316]'
            }`}
          >
            All Recipes
          </button>
          {isAuthenticated ? (
            <>
              <button
                onClick={() => onChange('mine')}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                  active === 'mine'
                    ? 'border-[#F97316] text-[#F97316]'
                    : 'border-transparent text-[#6B7280] hover:text-[#F97316]'
                }`}
              >
                My Recipes
              </button>
              <button
                onClick={() => onChange('create')}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                  active === 'create'
                    ? 'border-[#F97316] text-[#F97316]'
                    : 'border-transparent text-[#6B7280] hover:text-[#F97316]'
                }`}
              >
                Create Recipe
              </button>
              <button
                onClick={() => onChange('pantry')}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                  active === 'pantry'
                    ? 'border-[#F97316] text-[#F97316]'
                    : 'border-transparent text-[#6B7280] hover:text-[#F97316]'
                }`}
              >
                Pantry
              </button>
            </>
          ) : (
            <button
              onClick={() => onChange('login')}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                active === 'login'
                  ? 'border-[#F97316] text-[#F97316]'
                  : 'border-transparent text-[#6B7280] hover:text-[#F97316]'
              }`}
            >
              Login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export type { Tab };

