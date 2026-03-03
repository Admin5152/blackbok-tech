import React from 'react';
import { Menu, User as UserIcon, Wrench, ShoppingCart, Home, ShoppingBag, RefreshCcw, Sun, Moon } from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import { User, CartItem } from '../types';

type Theme = 'light' | 'dark';

interface NavbarProps {
  user: User | null;
  cart: CartItem[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  /** Global app theme */
  theme?: Theme;
  setTheme?: (t: Theme) => void;
}

const ViewfinderLogo = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
    <path d="M25 40V28C25 26.3431 26.3431 25 28 25H40" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <path d="M60 25H72C73.6569 25 75 26.3431 75 28V40" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <path d="M75 60V72C75 73.6569 73.6569 75 72 75H60" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <path d="M40 75H28C26.3431 75 25 73.6569 25 72V60" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
    <rect x="38" y="44" width="24" height="12" rx="6" fill="currentColor" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  user,
  cart,
  searchQuery,
  setSearchQuery,
  setIsMobileMenuOpen,
  theme,
  setTheme,
}) => {
  const location = useLocation();
  const cartCount = cart.reduce((a, c) => a + c.quantity, 0);
  const isLight = theme === 'light';

  const navItemClass = (path: string) => {
    const active = location.pathname === path;
    if (isLight) {
      return `flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest ${
        active ? 'bg-black text-white shadow-md' : 'text-black/60 hover:text-black hover:bg-black/5'
      }`;
    }
    return `flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest ${
      active ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]' : 'text-white/40 hover:text-white hover:bg-white/5 hover:shadow-[0_0_16px_rgba(205,160,50,0.5)]'
    }`;
  };

  return (
    <nav
      className={`sticky top-0 z-[60] h-16 sm:h-20 lg:h-24 flex items-center border-b backdrop-blur-3xl no-print ${isLight ? 'border-black/10 bg-[#FAFAFA]/95' : 'border-white/5'}`}
      style={isLight ? undefined : { backgroundColor: 'rgba(18,18,18,0.95)' }}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3 group transition-opacity">
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
            <ViewfinderLogo />
          </div>
          <div className="hidden sm:block">
            <h1 className={`text-lg font-black tracking-tighter leading-none ${isLight ? 'text-black' : 'text-white'}`}>BLACKBOX</h1>
            <p className={`text-[9px] font-black tracking-[0.3em] uppercase ${isLight ? 'text-black/50' : 'text-white/50'}`}></p>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          <Link to="/" className={navItemClass('/')}><Home size={16} /> Home</Link>
          <Link to="/store" className={navItemClass('/store')}><ShoppingBag size={16} /> Products</Link>
          <Link to="/trades" className={navItemClass('/trades')}><RefreshCcw size={16} /> Trades</Link>
          <Link to="/repair" className={navItemClass('/repair')}><Wrench size={16} /> Repairs</Link>
          <Link to="/cart" className={navItemClass('/cart')}>
            <ShoppingCart size={16} /> Cart
            {cartCount > 0 && (
              <span className={`ml-2 px-2 py-0.5 text-[9px] rounded-full ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                {cartCount}
              </span>
            )}
          </Link>

          <Link
            to={user ? '/profile' : '/auth'}
            className={`
              glow-border flex items-center gap-2 px-8 py-3 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest ml-4
              ${user
                ? isLight ? 'bg-black/5 text-black border border-black/10 hover:border-black/20' : 'bg-white/5 text-white border border-white/10 hover:border-white/30 hover:shadow-[0_0_16px_rgba(205,160,50,0.5)]'
                : isLight ? 'bg-black text-white shadow-lg hover:bg-black/90' : 'bg-white text-black shadow-lg hover:brightness-90 hover:shadow-[0_0_20px_rgba(205,160,50,0.6)]'}
            `}
          >
            <UserIcon size={16} /> {user ? 'Account' : 'Sign In'}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {setTheme && (
            <button
              type="button"
              onClick={() => setTheme(isLight ? 'dark' : 'light')}
              className={`p-2.5 rounded-full border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA032] focus-visible:ring-offset-2 ${
                isLight
                  ? 'border-black/10 bg-black/5 text-black hover:bg-black/10'
                  : 'border-white/10 bg-white/5 text-white hover:bg-white/10 hover:shadow-[0_0_14px_rgba(205,160,50,0.45)]'
              }`}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {isLight ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`lg:hidden p-2.5 sm:p-3 rounded-full transition-all ${isLight ? 'text-black/60 hover:text-black hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/5 hover:shadow-[0_0_14px_rgba(205,160,50,0.45)]'}`}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>
    </nav>
  );
};



















//OLD CODE with old colorsBackground changed from pure black to #121212
//Yellow (#CDA032) changed to white for text/active states




// import React from 'react';
// import { Search, Menu, User as UserIcon, Wrench, X, ShoppingCart, Home, ShoppingBag, RefreshCcw } from 'lucide-react';
// import { Link, useLocation } from '@tanstack/react-router';
// import { User, CartItem } from '../types';

// interface NavbarProps {
//   user: User | null;
//   cart: CartItem[];
//   searchQuery: string;
//   setSearchQuery: (q: string) => void;
//   setIsMobileMenuOpen: (open: boolean) => void;
// }

// const ViewfinderLogo = () => (
//   <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
//     <path d="M25 40V28C25 26.3431 26.3431 25 28 25H40" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
//     <path d="M60 25H72C73.6569 25 75 26.3431 75 28V40" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
//     <path d="M75 60V72C75 73.6569 73.6569 75 72 75H60" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
//     <path d="M40 75H28C26.3431 75 25 73.6569 25 72V60" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
//     <rect x="38" y="44" width="24" height="12" rx="6" fill="currentColor"/>
//   </svg>
// );

// export const Navbar: React.FC<NavbarProps> = ({ 
//   user, cart, searchQuery, setSearchQuery, setIsMobileMenuOpen 
// }) => {
//   const location = useLocation();
//   const cartCount = cart.reduce((a, c) => a + c.quantity, 0);

//   const navItemClass = (path: string) => `
//     flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest
//     ${location.pathname === path
//       ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)]'
//       : 'text-white/40 hover:text-white hover:bg-white/5 hover:shadow-[0_0_16px_rgba(205,160,50,0.5)]'}
//   `;

//   return (
//     <nav className="sticky top-0 z-[60] h-24 flex items-center border-b border-white/5 backdrop-blur-3xl no-print" style={{ backgroundColor: 'rgba(18,18,18,0.95)' }}>
//       <div className="max-w-[1440px] mx-auto px-8 w-full flex items-center justify-between">
//         <Link to="/" className="flex items-center gap-3 group transition-opacity">
//           <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center text-black">
//             <ViewfinderLogo />
//           </div>
//           <div className="hidden sm:block">
//             <h1 className="text-lg font-black tracking-tighter leading-none">BLACKBOX</h1>
//             <p className="text-[9px] font-black text-white/50 tracking-[0.3em] uppercase"></p>
//           </div>
//         </Link>

//         <div className="hidden lg:flex items-center gap-1">
//           <Link to="/" className={navItemClass('/')}><Home size={16} /> Home</Link>
//           <Link to="/store" className={navItemClass('/store')}><ShoppingBag size={16} /> Products</Link>
//           <Link to="/trades" className={navItemClass('/trades')}><RefreshCcw size={16} /> Trades</Link>
//           <Link to="/repair" className={navItemClass('/repair')}><Wrench size={16} /> Repairs</Link>
//           <Link to="/cart" className={navItemClass('/cart')}>
//             <ShoppingCart size={16} /> Cart
//             {cartCount > 0 && (
//               <span className="ml-2 px-2 py-0.5 bg-white text-black text-[9px] rounded-full">
//                 {cartCount}
//               </span>
//             )}
//           </Link>

//           <Link
//             to={user ? '/profile' : '/auth'}
//             className={`
//               flex items-center gap-2 px-8 py-3 rounded-xl transition-all duration-300 text-[11px] font-black uppercase tracking-widest ml-4
//               ${user
//                 ? 'bg-white/5 text-white border border-white/10 hover:border-white/30 hover:shadow-[0_0_16px_rgba(205,160,50,0.5)]'
//                 : 'bg-white text-black shadow-lg hover:brightness-90 hover:shadow-[0_0_20px_rgba(205,160,50,0.6)]'}
//             `}
//           >
//             <UserIcon size={16} /> {user ? 'Account' : 'Sign In'}
//           </Link>
//         </div>

//         <div className="flex items-center gap-4">
//           <div className="relative hidden md:block">
//             <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
//             <input
//               placeholder="SEARCH..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="bg-white/5 border border-white/10 rounded-full pl-12 pr-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-white/30 transition-all w-40 focus:w-56"
//               style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
//             />
//           </div>
//           <button
//             onClick={() => setIsMobileMenuOpen(true)}
//             className="lg:hidden p-3 text-white/40 hover:text-white hover:bg-white/5 hover:shadow-[0_0_14px_rgba(205,160,50,0.45)] rounded-full transition-all"
//           >
//             <Menu size={24} />
//           </button>
//         </div>
//       </div>
//     </nav>
//   );
// };