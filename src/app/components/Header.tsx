import { Search, ShoppingCart, User, Gamepad2 } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-zinc-800 sticky top-0 z-40 bg-[#0d0d0d]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Gamepad2 className="size-5 text-lime-400" />
            <span className="text-lg tracking-tight text-white">
              Game<span className="text-lime-400">Store</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm">
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Store</a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Library</a>
            <a href="#" className="text-zinc-400 hover:text-white transition-colors">Community</a>
            <a href="#" className="text-lime-400 hover:text-lime-300 transition-colors">AI Assistant</a>
          </nav>

          <div className="flex-1 max-w-sm hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-600" />
              <input
                type="text"
                placeholder="Search games..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-4 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-lime-400/40 focus:ring-1 focus:ring-lime-400/20 text-sm transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative text-zinc-400 hover:text-white transition-colors">
              <ShoppingCart className="size-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-lime-400 text-black text-[10px] size-4 rounded-full flex items-center justify-center leading-none font-bold">
                3
              </span>
            </button>
            <button className="border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white rounded-md p-1.5 transition-colors">
              <User className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
