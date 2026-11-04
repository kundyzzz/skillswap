// A very small router based on the URL hash (#/login, #/profile ...).
// Hash routing works on any free static hosting without extra server setup.
import { useEffect, useState } from 'react';

function currentPath() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
}

export function navigate(path) {
  window.location.hash = path;
}

export function useRoute() {
  const [path, setPath] = useState(currentPath());

  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return path;
}

export function Link({ to, children, className, ...rest }) {
  return (
    <a href={`#${to}`} className={className} {...rest}>
      {children}
    </a>
  );
}

// Where to go right after a successful login/sign-up (App reads it once).
let pendingRedirect = null;
export function setRedirectAfterAuth(path) {
  pendingRedirect = path;
}
export function takeRedirectAfterAuth() {
  const path = pendingRedirect;
  pendingRedirect = null;
  return path;
}
