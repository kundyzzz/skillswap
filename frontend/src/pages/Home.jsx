// Figma screen "Home matches" — US-06 bidirectional matching.
import { useEffect, useState } from 'react';
import * as api from '../api';
import { useAuth } from '../auth';
import { Link } from '../router';
import Page from '../components/Page';
import StudentCard from '../components/StudentCard';
import { isFilled, PROFILE_FIELDS, profileCompletion } from '../utils';

export default function Home() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState('all'); // all | mutual | can_teach_you
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getUser(user.id), api.getMySkills(), api.getMatches()])
      .then(([p, s, m]) => {
        setProfile(p);
        setSkills(s);
        setMatches(m);
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
