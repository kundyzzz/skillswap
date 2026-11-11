// Figma screen "Sign up and log in" — US-01 (register / log in).
import { useState } from 'react';
import * as api from '../api';
import { useAuth } from '../auth';
import { setRedirectAfterAuth } from '../router';
import Page from '../components/Page';
import { EMAIL_REGEX } from '../utils';

export default function AuthPage({ initialMode = 'signup' }) {
  const [mode, setMode] = useState(initialMode);

  return (
    <Page variant="auth">
      <div className="auth-grid">
        <section>
          <span className="eyebrow">Get started</span>
          <h1>
            Exchange skills with
            <br />
            students on campus.
          </h1>
          <p className="lead">
            Teach what you know, learn what you need, and connect with fellow university students.
          </p>
          <ul className="checklist">
            <li>
              <span className="box" /> Create your student profile
            </li>
            <li>
              <span className="box" /> Choose skills to teach and learn
            </li>
            <li>
              <span className="box" /> Connect with a compatible match
            </li>
          </ul>
        </section>

        <section className="card auth-card">
          <div className="tabs" role="tablist">
            <button
              role="tab"
              aria-selected={mode === 'signup'}
              className={`tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Sign up
            </button>
            <button
              role="tab"
              aria-selected={mode === 'login'}
              className={`tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              Log in
            </button>
          </div>
          {mode === 'signup' ? (
            <SignUpForm onSwitch={() => setMode('login')} />
          ) : (
            <LoginForm onSwitch={() => setMode('signup')} />
          )}
        </section>
      </div>
    </Page>
  );
}

function SignUpForm({ onSwitch }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', university: '', password: '' });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Please enter your full name';
    if (!EMAIL_REGEX.test(form.email.trim())) next.email = 'Please enter a valid email address';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
    if (!agree) next.agree = 'Please accept the Terms of Use';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setBusy(true);
    try {
      await api.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.university.trim() ? { university: form.university.trim() } : {})
      });
      setRedirectAfterAuth('/setup'); // new users go to profile setup first
      await login(form.email.trim(), form.password);
    } catch (error) {
      if (error.code === 'EMAIL_EXISTS') {
        setServerError('This email is already registered. Try logging in instead.');
      } else {
        setServerError(error.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <h2>Create your account</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 18 }}>
        Use your university email address to join SkillSwap.
      </p>

      {serverError && (
        <div className="alert error" role="alert">
          {serverError}
        </div>
      )}

      <div className="field">
        <label htmlFor="su-name">Full name</label>
        <input
          id="su-name"
          className={`input ${errors.name ? 'invalid' : ''}`}
          placeholder="Alex Kim"
          value={form.name}
          onChange={set('name')}
          autoComplete="name"
        />
        {errors.name && <div className="field-error">{errors.name}</div>}
      </div>

      <div className="field">
        <label htmlFor="su-email">Email</label>
        <input
          id="su-email"
          type="email"
          className={`input ${errors.email ? 'invalid' : ''}`}
          placeholder="name@uni.edu"
          value={form.email}
          onChange={set('email')}
          autoComplete="email"
        />
        {errors.email && <div className="field-error">{errors.email}</div>}
      </div>

      <div className="field">
        <label htmlFor="su-university">University (optional)</label>
        <input
          id="su-university"
          className="input"
          placeholder="KBTU"
          value={form.university}
          onChange={set('university')}
        />
      </div>

      <div className="field">
        <label htmlFor="su-password">Password</label>
        <input
          id="su-password"
          type="password"
          className={`input ${errors.password ? 'invalid' : ''}`}
          placeholder="At least 8 characters"
          value={form.password}
          onChange={set('password')}
          autoComplete="new-password"
        />
        {errors.password && <div className="field-error">{errors.password}</div>}
      </div>

      <label className="checkbox">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />I
        agree to the Terms of Use and Privacy Policy.
      </label>
      {errors.agree && (
        <div className="field-error" style={{ marginTop: -10, marginBottom: 12 }}>
          {errors.agree}
        </div>
      )}

      <button className="btn primary block" type="submit" disabled={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </button>

      <p className="muted center-text" style={{ marginBottom: 0 }}>
        Already have an account?{' '}
        <button type="button" className="link-btn" onClick={onSwitch}>
          Log in
        </button>
      </p>
    </form>
  );
}

function LoginForm({ onSwitch }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.code === 'INVALID_CREDENTIALS' ? 'Invalid email or password' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <h2>Welcome back</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 18 }}>
        Log in to see your skills and matches.
      </p>

      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}

      <div className="field">
        <label htmlFor="li-email">Email</label>
        <input
          id="li-email"
          type="email"
          className="input"
          placeholder="name@uni.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <div className="field">
        <label htmlFor="li-password">Password</label>
        <input
          id="li-password"
          type="password"
          className="input"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      <button className="btn primary block" type="submit" disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>

      <p className="muted center-text" style={{ marginBottom: 0 }}>
        New to SkillSwap?{' '}
        <button type="button" className="link-btn" onClick={onSwitch}>
          Create an account
        </button>
      </p>
    </form>
  );
}
