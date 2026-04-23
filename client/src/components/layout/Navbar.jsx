import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "../ui/Logo";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import Button from "../ui/Button";
import NotificationDropdown from "./NotificationDropdown";
import DirectMessaging from "./DirectMessaging";
import { searchUsers } from "../../services/userService";

/* ---------- STYLES ---------- */

const navLinkClass =
  "rounded-md px-2 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]";

const navActionButtonClass =
  "min-h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] shadow-md transition hover:border-[var(--accent)] hover:text-[var(--accent)]";

/* ---------- MOBILE MENU ---------- */

const mobileMenuPanelClass = (open) =>
  `fixed top-0 left-0 z-50 flex h-screen w-[min(85vw,22rem)] flex-col 
  bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-2xl 
  transform transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] 
  ${open ? "translate-x-0 opacity-100 scale-100" : "-translate-x-full opacity-0 scale-95"}`;

const mobileMenuBackdropClass = (open) =>
  `fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-all duration-300 
  ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`;

/* ---------- SEARCH WIDGET ---------- */

const SearchWidget = ({ mobile = false, onResultClick }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchUsers(query);
        setResults(data || []);
        setIsOpen(true);
      } catch (err) {
        console.error("Search error", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
          className={`w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] ${
            !mobile ? "pl-9" : ""
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full max-h-60 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] shadow-lg z-[200]">
          {loading ? (
            <div className="p-3 text-sm text-center text-[var(--text-secondary)]">Searching...</div>
          ) : results.length > 0 ? (
            <ul className="flex flex-col">
              {results.map((u) => (
                <li key={u._id}>
                  <Link
                    to={`/profile/${u.username}`}
                    onClick={() => {
                      setIsOpen(false);
                      if (onResultClick) onResultClick();
                    }}
                    className="flex flex-row items-center gap-3 px-3 py-2 hover:bg-[var(--bg-hover)] transition"
                  >
                    <img 
                      src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} 
                      alt={u.username} 
                      className="w-8 h-8 rounded-full border border-[var(--border)] object-cover bg-[var(--bg-secondary)] shrink-0"
                    />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-semibold truncate text-[var(--text-primary)]">{u.fullName || u.username}</span>
                      <span className="text-xs text-[var(--text-secondary)] truncate">@{u.username}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-sm text-center text-[var(--text-secondary)]">No users found</div>
          )}
        </div>
      )}
    </div>
  );
};

/* ---------- INNER COMPONENTS (MOVED OUTSIDE) ---------- */

const ThemeToggle = ({ theme, toggleTheme }) => (
  <button onClick={toggleTheme} className="text-xs font-semibold">
    {theme === "dark" ? "Sun" : "Moon"}
  </button>
);

const HamburgerButton = ({ mobileOpen, setMobileOpen }) => (
  <button
    onClick={() => setMobileOpen((o) => !o)}
    className={`lg:hidden relative inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-md transition-all duration-300
    ${
      mobileOpen
        ? "bg-[var(--accent)] border-[var(--accent)] text-white"
        : "bg-[var(--bg-tertiary)] border-[var(--border)] hover:border-[var(--accent)]"
    }`}
  >
    <div className="relative w-5 h-5">
      <span
        className={`absolute left-0 top-1/2 h-[2px] w-full bg-current transform transition duration-300 ${
          mobileOpen ? "rotate-45" : "-translate-y-2"
        }`}
      />
      <span
        className={`absolute left-0 top-1/2 h-[2px] w-full bg-current transition duration-300 ${
          mobileOpen ? "opacity-0" : ""
        }`}
      />
      <span
        className={`absolute left-0 top-1/2 h-[2px] w-full bg-current transform transition duration-300 ${
          mobileOpen ? "-rotate-45" : "translate-y-2"
        }`}
      />
    </div>
  </button>
);

const MobileMenuShell = ({ mobileOpen, setMobileOpen, children }) => (
  <>
    <div
      className={mobileMenuBackdropClass(mobileOpen)}
      onClick={() => setMobileOpen(false)}
    />

    <div className={mobileMenuPanelClass(mobileOpen)}>
      <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
        <span className="text-lg font-semibold">Menu</span>
        <button onClick={() => setMobileOpen(false)}>✕</button>
      </div>

      <div className="flex flex-col h-full p-4 overflow-y-auto overflow-x-hidden">
        {children}
      </div>
    </div>
  </>
);

/* ---------- COMPONENT ---------- */

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, [mobileOpen]);

  /* ---------- UI ---------- */

  return (
    <nav className="sticky top-0 z-[100] border-b border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-md">
      <div className="mx-auto w-full max-w-7xl px-[5%] py-3">

        <div className="flex w-full items-center">

          {/* LEFT */}
          <div className="flex flex-1 items-center">
            <Link to="/">
              <Logo size="sm" />
            </Link>
          </div>

          {/* CENTER (SEARCH) */}
          <div className="hidden lg:flex flex-1 justify-center">
            <div className="flex items-center gap-4 w-full max-w-md">

              <SearchWidget onResultClick={() => setMobileOpen(false)} />

              <a href="#" className={navLinkClass}>Docs</a>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-1 justify-end items-center gap-4">

            <div className="hidden lg:flex items-center gap-4">
              {user ? (
                <>
                  <DirectMessaging />
                  <NotificationDropdown onOpen={() => setMobileOpen(false)} />

                  <Link to={`/profile/${user.username}`} className={navLinkClass}>
                    Profile
                  </Link>

                  <Link to="/dashboard">
                    <Button size="sm">Dashboard</Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={logout}>
                    Logout
                  </Button>
                </>
              ) : (
                <Link to="/login">
                  <Button variant="none" size="sm" className={navActionButtonClass}>
                    Sign In
                  </Button>
                </Link>
              )}
            </div>

            <HamburgerButton mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
          </div>

        </div>
      </div>

      {/* MOBILE MENU */}
      <MobileMenuShell mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}>

        <div className="flex flex-col gap-5 flex-1">

          {/* Search (Mobile) */}
          <SearchWidget mobile={true} onResultClick={() => setMobileOpen(false)} />

          {/* Theme */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Appearance</span>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs uppercase mb-2">Navigation</p>

            <div className="flex flex-col gap-1">
              <a href="#" className="px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)]">
                Docs
              </a>

              {user && (
                <Link
                  to={`/profile/${user.username}`}
                  className="px-3 py-2 rounded-lg hover:bg-[var(--bg-hover)]"
                >
                  Profile
                </Link>
              )}
            </div>
          </div>

          {/* Actions */}
          {user && (
            <div className="flex gap-2">
              <DirectMessaging />
              <NotificationDropdown onOpen={() => setMobileOpen(false)} />
            </div>
          )}

        </div>

        {/* Bottom */}
        <div className="flex flex-col gap-2 pt-6 mt-auto">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button className="h-10 w-full">Dashboard</Button>
              </Link>

              <Button onClick={logout} className="h-9 w-full">
                Logout
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button className="h-10 w-full">Sign In</Button>
            </Link>
          )}
        </div>

      </MobileMenuShell>
    </nav>
  );
};

export default Navbar;