// US-07: search students who teach a subject, filter by category.
import { useEffect, useState } from 'react';
import * as api from '../api';
import Page from '../components/Page';
import StudentCard from '../components/StudentCard';

export default function SearchPage() {
  const [categories, setCategories] = useState([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState(null); // null = still loading
  const [lastQuery, setLastQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCategories().then(setCategories).catch((e) => setError(e.message));
    run('', ''); // show everyone who teaches something right away
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (s = subject, c = category) => {
    setBusy(true);
    setError('');
    try {
      setResults(await api.searchStudents(s.trim(), c));
      setLastQuery(s.trim());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    run();
  };

  const clear = () => {
    setSubject('');
    setCategory('');
    run('', '');
  };

  // Picking a category searches immediately.
  const changeCategory = (value) => {
    setCategory(value);
    run(subject, value);
  };

  const filtered = Boolean(lastQuery || category);

  return (
    <Page>
      <h1 className="page-title">Find a student by subject</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Search everyone who can teach a subject, even without a mutual match.
      </p>

      <form className="card search-form" onSubmit={submit} role="search">
        <input
          className="input"
          placeholder='Subject, e.g. "Physics"'
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-label="Subject"
        />
        <select
          className="select"
          value={category}
          onChange={(e) => changeCategory(e.target.value)}
          aria-label="Category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="alert error section-gap" role="alert">
          {error}
        </div>
      )}

      {!results && !error && <div className="spinner">Loading students…</div>}

      {results && results.length === 0 && (
        <div className="panel white section-gap center-text" data-testid="no-results">
          <h3>No students found</h3>
          <p className="muted">
            Nobody teaches {lastQuery ? `"${lastQuery}"` : 'this'} yet. Try another subject or post it on
            the request board.
          </p>
          <button className="btn" type="button" onClick={clear}>
            Clear search and filters
          </button>
        </div>
      )}

      {results && results.length > 0 && (
        <>
          <div className="results-bar section-gap">
            <span className="small-caps" data-testid="result-count">
              {filtered
                ? `${results.length} ${results.length === 1 ? 'student' : 'students'} found`
                : `All students who teach · ${results.length}`}
            </span>
            {filtered && (
              <button className="link-btn" type="button" onClick={clear}>
                Clear search
              </button>
            )}
          </div>
          <div className="student-grid">
            {results.map((s, i) => (
              <StudentCard key={s.id} student={s} index={i} teachLabel="I can teach" teaches={s.teaches} />
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
