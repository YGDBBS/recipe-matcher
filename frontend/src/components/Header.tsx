import { CookingPot, LogOut, User } from 'lucide-react';

interface HeaderProps {
  onLogout: () => void;
  isAuthenticated: boolean;
}

export default function Header({ onLogout, isAuthenticated }: HeaderProps) {
  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <CookingPot className="w-6 h-6 text-[#F97316]" />
            <span className="font-bold text-xl text-[#1F2937]">Recipe Matcher</span>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-5 h-5 text-[#6B7280]" />
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#6B7280] hover:bg-[#FFF7ED] rounded"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
