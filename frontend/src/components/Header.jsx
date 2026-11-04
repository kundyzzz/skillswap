import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth';
import { Link, navigate } from '../router';
import Avatar from './Avatar';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="SkillSwap home">
      <span>
        Skill<span className="swap">Swap</span>
      </span>
      <svg width="44" height="7" viewBox="0 0 44 7" aria-hidden="true">
        <path
          d="M1 4c4-3 7-3 10 0s7 3 10 0 7-3 10 0 7 3 12-1"
          stroke="#ff7a30"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </Link>
  );
}

export default function Header({ path }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => setOpen(false), [path]);

  if (!user) {
    return (
      <header className="header">
        <Logo />
        <Link to="/auth" className="link-btn">
          Sign up / Log in
        </Link>
      </header>
    );
  }

  const isActive = (p) => (path === p || path.startsWith(`${p}/`) ? 'active' : '');

  return (
    <header className="header">
      <Logo />
      <nav className="nav">
        <Link to="/" className={path === '/' ? 'active' : ''}>
          Home
        </Link>
        <Link to="/skills" className={isActive('/skills')}>
          My skills
        </Link>
        <Link to="/profile" className={isActive('/profile')}>
          Profile
        </Link>
      </nav>
      <div className="user-menu" ref={menuRef}>
        <button
          className="user-chip"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <Avatar name={user.name} size={30} />
          <span>{user.name}</span>
          <span aria-hidden="true">▾</span>
        </button>
        {open && (
          <div className="dropdown" role="menu">
            <div className="muted">{user.email}</div>
            <Link to="/profile">My profile</Link>
            <Link to="/setup">Edit profile</Link>
            <button
              onClick={() => {
                logout();
                navigate('/auth');
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

