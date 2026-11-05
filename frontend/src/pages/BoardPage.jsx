// US-08 post a help request, US-09 respond "I can help".
import { useEffect, useState } from 'react';
import * as api from '../api';
import { useAuth } from '../auth';
import { Link } from '../router';
import Page from '../components/Page';
import Avatar from '../components/Avatar';

const TITLE_LIMIT = 120;

function timeAgo(date) {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export default function BoardPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.getRequests().then(setRequests);

  useEffect(() => {
    Promise.all([api.getCategories(), api.getRequests()])
      .then(([cats, reqs]) => {
        setCategories(cats);
        setRequests(reqs);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <Page>
        <div className="alert error">{error}</div>
      </Page>
    );
  }
  if (!requests) return <div className="spinner">Loading requests…</div>;

  const open = requests.filter((r) => r.status === 'open').length;

  return (
    <Page>
      <span className="eyebrow plain">07 · Request board</span>
      <h1 style={{ marginTop: 4 }}>Ask for help</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Post what you need help with. Anyone who knows the subject can answer “I can help”.
      </p>

      <div className="board-grid">
        <NewRequestForm categories={categories} onCreated={load} />

        <section>
          <div className="results-bar" style={{ marginTop: 0 }}>
            <span className="small-caps" data-testid="request-count">
              {requests.length} requests · {open} open
            </span>
          </div>
          {requests.length === 0 && <div className="empty">No requests yet. Be the first to ask!</div>}
          <div className="request-list">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} isMine={r.author.id === user.id} onChange={load} />
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}

function NewRequestForm({ categories, onCreated }) {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    const next = {};
    if (!title.trim()) next.title = 'Please describe what you need help with';
    else if (title.trim().length > TITLE_LIMIT) next.title = `Title must not exceed ${TITLE_LIMIT} characters`;
    if (!categoryId) next.category = 'Please choose a category';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      await api.createRequest(title.trim(), categoryId);
      setTitle('');
      setCategoryId('');
      setMessage('Your request is on the board.');
      await onCreated();
    } catch (err) {
      setErrors({ title: err.message });
    } finally {
      setBusy(false);
    }
  };

  const tooLong = title.trim().length > TITLE_LIMIT;

  return (
    <form className="card" onSubmit={submit} noValidate data-testid="new-request">
      <h3>New request</h3>
      <div className="field section-gap">
        <label htmlFor="rq-title">What do you need help with?</label>
        <textarea
          id="rq-title"
          className={`textarea ${errors.title ? 'invalid' : ''}`}
          placeholder="Need help with SQL joins"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ minHeight: 70 }}
        />
        <div className="muted" style={{ textAlign: 'right', color: tooLong ? 'var(--red)' : undefined }}>
          {title.trim().length}/{TITLE_LIMIT}
        </div>
        {errors.title && (
          <div className="field-error" role="alert">
            {errors.title}
          </div>
        )}
      </div>
      <div className="field">
        <label htmlFor="rq-category">Category</label>
        <select
          id="rq-category"
          className={`select ${errors.category ? 'invalid' : ''}`}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Choose a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.category && <div className="field-error">{errors.category}</div>}
      </div>
      {message && (
        <div className="alert success" role="status">
          {message}
        </div>
      )}
      <button className="btn primary block" type="submit" disabled={busy}>
        {busy ? 'Posting…' : 'Post request'}
      </button>
    </form>
  );
}

function RequestCard({ request: r, isMine, onChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const act = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const closed = r.status === 'closed';

  return (
    <article className={`card request-card ${closed ? 'closed' : ''}`} data-testid="request-card">
      <div className="space-between" style={{ alignItems: 'flex-start' }}>
        <h3 className="request-title">{r.title}</h3>
        <span className={`match-badge ${closed ? 'closed' : 'mutual'}`}>{closed ? 'Closed' : 'Open'}</span>
      </div>
      <div className="request-meta">
        <span className="chip static">{r.category_name}</span>
        <span className="muted">
          by{' '}
          {isMine ? (
            <b>you</b>
          ) : (
            <Link to={`/users/${r.author.id}`} className="link-btn">
              {r.author.name}
            </Link>
          )}{' '}
          · {timeAgo(r.created_at)}
        </span>
      </div>

      {isMine ? (
        <div className="section-gap">
          <div className="small-caps" style={{ marginBottom: 6 }}>
            {r.responders.length === 0 ? 'No responders yet' : `${r.responders.length} can help`}
          </div>
          <div className="chips" data-testid="responders">
            {r.responders.map((p) => (
              <Link key={p.id} to={`/users/${p.id}`} className="chip">
                <Avatar name={p.name} size={20} /> {p.name}
              </Link>
            ))}
          </div>
          <button
            className="btn small section-gap"
            disabled={busy}
            onClick={() => act(() => api.setRequestStatus(r.id, closed ? 'open' : 'closed'))}
          >
            {closed ? 'Reopen request' : 'Close request'}
          </button>
        </div>
      ) : (
        <div className="space-between section-gap">
          <span className="muted">
            {r.responses_count} {r.responses_count === 1 ? 'student' : 'students'} can help
          </span>
          {r.responded_by_me ? (
            <span className="match-badge oneway">✓ Responded</span>
          ) : (
            <button
              className="btn primary small"
              disabled={busy || closed}
              onClick={() => act(() => api.respondToRequest(r.id))}
            >
              I can help
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="alert error section-gap" role="alert" style={{ marginBottom: 0 }}>
          {error}
        </div>
      )}
    </article>
  );
}
