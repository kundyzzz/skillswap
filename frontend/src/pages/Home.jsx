// Home after login: shows what to do next. Matches list arrives in Sprint 2 (GET /matches).
import { useEffect, useState } from 'react';
import * as api from '../api';
import { useAuth } from '../auth';
import { Link } from '../router';
import Page from '../components/Page';
import { isFilled, PROFILE_FIELDS, profileCompletion } from '../utils';

export default function Home() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getUser(user.id), api.getMySkills()])
      .then(([p, s]) => {
        setProfile(p);
        setSkills(s);
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

  return (
    <Page>
      <div className="space-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <span className="eyebrow plain">04 · Matches</span>
          <h1 style={{ marginTop: 4 }}>Hi, {user.name.split(' ')[0]}!</h1>
          <p className="muted" style={{ margin: 0 }}>
            Finish these steps and we will show students you could learn with.
          </p>
        </div>
        <span className="badge">Profile completion: {completion}%</span>
      </div>

      <div className="home-grid">
        <div className="card step-card" style={{ background: 'var(--peach)' }}>
          <h3>1. Basic details</h3>
          <div className="status">{profileDone ? '✓ Done' : 'Some details are missing'}</div>
          <Link to={profileDone ? '/profile' : '/setup'} className="btn primary block">
            {profileDone ? 'View profile' : 'Complete profile'}
          </Link>
        </div>
        <div className="card step-card" style={{ background: 'var(--mint)' }}>
          <h3>2. Skills I can teach</h3>
          <div className="status">{teachCount > 0 ? `✓ ${teachCount} added` : 'Add at least one'}</div>
          <Link to="/skills" className="btn primary block">
            {teachCount > 0 ? 'Edit skills' : 'Add skills'}
          </Link>
        </div>
        <div className="card step-card" style={{ background: '#efe3ff' }}>
          <h3>3. Skills I want to learn</h3>
          <div className="status">{learnCount > 0 ? `✓ ${learnCount} added` : 'Add at least one'}</div>
          <Link to="/skills" className="btn primary block">
            {learnCount > 0 ? 'Edit skills' : 'Add skills'}
          </Link>
        </div>
      </div>

      <div className="panel white section-gap">
        <h3>Students you could learn with</h3>
        <p className="muted" style={{ margin: 0 }}>
          Matching is coming in Sprint 2. As soon as the backend adds <code>GET /api/matches</code>,
          your compatible students will appear here.
        </p>
      </div>
    </Page>
  );
}
