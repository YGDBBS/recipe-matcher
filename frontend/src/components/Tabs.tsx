type Tab = 'all' | 'mine' | 'create' | 'pantry' | 'login';

interface TabsProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  isAuthenticated: boolean;
}

export default function Tabs({ active, onChange, isAuthenticated }: TabsProps) {
  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => onChange('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
              active === 'all'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
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
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                My Recipes
              </button>
              <button
                onClick={() => onChange('create')}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                  active === 'create'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Create Recipe
              </button>
              <button
                onClick={() => onChange('pantry')}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                  active === 'pantry'
                    ? 'border-emerald-600 text-emerald-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
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
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
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

