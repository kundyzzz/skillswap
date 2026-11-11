// Figma screen "Home matches" — US-06 bidirectional matching.
import { useEffect, useState } from 'react';
import * as api from '../api';
import { useAuth } from '../auth';
import { Link } from '../router';
import Page from '../components/Page';
import StudentCard from '../components/StudentCard';
import Avatar from '../components/Avatar';
import { useUndo } from '../useUndo';
import UndoStrip from '../components/UndoStrip';
import { isFilled, PROFILE_FIELDS, profileCompletion } from '../utils';

export default function Home() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [matches, setMatches] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [filter, setFilter] = useState('all'); // all | mutual | can_teach_you
  const [error, setError] = useState('');

  useEffect(() => {
    // One load for the whole page, so the request block does not pop in later.
    Promise.all([
      api.getUser(user.id),
      api.getMySkills(),
      api.getMatches(),
      api.getContactRequests({ fresh: true }).catch(() => ({ incoming: [] }))
    ])
      .then(([p, s, m, r]) => {
        setIncoming(r.incoming);
        setSkills(s);
        setMatches(m);
        setProfile(p);
      })
      .catch((e) => setError(e.message));
  }, [user.id]);

  if (error) {
    return (
      <Page>
        <div className="alert error">{error}</div>
      </Page>
    );
  }
  if (!profile) return <div className="spinner">Loading…</div>;

  const profileDone = PROFILE_FIELDS.every((f) => isFilled(profile[f.key]));
  const teachCount = skills.filter((s) => s.type === 'teach').length;
  const learnCount = skills.filter((s) => s.type === 'learn').length;
  const completion = profileCompletion(profile, skills);
  const mutualCount = matches.filter((m) => m.match_type === 'mutual').length;
  const visible = filter === 'all' ? matches : matches.filter((m) => m.match_type === filter);

  return (
    <Page>
      <div className="space-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Students you could learn with</h1>
          <p className="muted" style={{ margin: 0 }}>
            Based on your selected teaching and learning skills.
          </p>
        </div>
        <span className="badge">Profile completion: {completion}%</span>
      </div>

      <ContactRequests initial={incoming || []} />

      {completion < 100 && (
        <div className="alert info section-gap" data-testid="steps-banner">
          <span className="dot" />
          <span>
            {!profileDone && (
              <>
                <Link to="/setup" className="link-btn">
                  Complete your profile
                </Link>
                {' · '}
              </>
            )}
            {teachCount === 0 && 'Add a skill you can teach · '}
            {learnCount === 0 && 'Add a skill you want to learn · '}
            <Link to="/skills" className="link-btn">
              Go to My skills
            </Link>
          </span>
        </div>
      )}

      {learnCount === 0 ? (
        <div className="panel white section-gap" data-testid="no-learn-skills">
          <h3>Add skills you want to learn to get matches</h3>
          <p className="muted">We match you with students who teach what you want to learn.</p>
          <Link to="/skills" className="btn primary">
            Go to My skills
          </Link>
        </div>
      ) : (
        <>
          <div className="results-bar section-gap">
            <span className="small-caps" data-testid="match-count">
              {matches.length} compatible {matches.length === 1 ? 'student' : 'students'}
              {mutualCount > 0 && ` · ${mutualCount} mutual`}
            </span>
            <div className="chips">
              {[
                ['all', 'All'],
                ['mutual', 'Mutual match'],
                ['can_teach_you', 'Can teach you']
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={`chip ${filter === value ? 'active' : ''}`}
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="empty section-gap">
              No matches yet. Try adding more skills, or{' '}
              <Link to="/search" className="link-btn">
                search by subject
              </Link>
              .
            </div>
          ) : (
            <div className="student-grid">
              {visible.map((m, i) => (
                <StudentCard
                  key={m.id}
                  student={m}
                  index={i}
                  badge={
                    m.match_type === 'mutual'
                      ? { kind: 'mutual', text: 'Mutual match' }
                      : { kind: 'oneway', text: 'Can teach you' }
                  }
                  teachLabel="Can teach you"
                  teaches={m.can_teach_you}
                  wants={m.wants_from_you}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  );
}

// US-12: contact requests waiting for my answer. Hidden when there are none.
// Accept is sent at once; Decline waits 5 seconds with an Undo button.
function ContactRequests({ initial }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState('');
  const undo = useUndo(5000);

  const load = () =>
    api
      .getContactRequests({ fresh: true })
      .then((r) => setItems(r.incoming))
      .catch(() => {});

  // Accept: sent at once. Decline: 5 seconds to undo.
  const answer = (r, status) => {
    setError('');
    const first = r.from.name;
    if (status === 'accepted') {
      api
        .answerContactRequest(r.id, 'accepted')
        .then(() => setItems((list) => list.filter((x) => x.id !== r.id)))
        .catch((e) => {
          setError(e.message);
          load();
        })
        .finally(api.announceRequestsChanged);
      return;
    }
    undo.start(
      r.id,
      status === 'accepted'
        ? `You accepted ${first}'s request`
        : `You declined ${first}'s request`,
      async () => {
        try {
          await api.answerContactRequest(r.id, status);
          setItems((list) => list.filter((x) => x.id !== r.id));
        } catch (e) {
          setError(e.message);
          load();
        } finally {
          api.announceRequestsChanged();
        }
      }
    );
  };

  if (items.length === 0) return null;

  const left = items.filter((r) => !undo.items[r.id]).length;

  return (
    <section className="panel white section-gap" data-testid="contact-requests">
      <h3 style={{ marginTop: 0 }}>
        Contact requests {left > 0 && <span className="nav-badge">{left}</span>}
      </h3>
      <p className="muted" style={{ marginTop: 0 }}>
        If you accept, you will both see each other&apos;s Telegram / WhatsApp.
      </p>
      <div className="request-list">
        {items.map((r) =>
          undo.items[r.id] ? (
            <UndoStrip key={r.id} label={undo.items[r.id].label} seconds={undo.secondsLeft(r.id)} onUndo={() => undo.undo(r.id)} />
          ) : (
            <div key={r.id} className="contact-request" data-testid="contact-request">
              <Avatar name={r.from.name} size={40} />
              <div className="contact-request-body">
                <div className="row-gap">
                  <Link to={`/users/${r.from.id}`} className="link-btn">
                    <b>{r.from.name}</b>
                  </Link>
                  {r.mutual_match && <span className="match-badge mutual">Mutual match</span>}
                </div>
                <div className="muted">
                  {[r.from.faculty, r.from.year && `Year ${r.from.year}`].filter(Boolean).join(' · ')}
                </div>
                {r.message && <p className="request-message">“{r.message}”</p>}
              </div>
              <div className="row-gap">
                <button className="btn primary small" onClick={() => answer(r, 'accepted')}>
                  Accept
                </button>
                <button className="btn small" onClick={() => answer(r, 'declined')}>
                  Decline
                </button>
              </div>
            </div>
          )
        )}
      </div>
      {error && (
        <div className="alert error section-gap" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
