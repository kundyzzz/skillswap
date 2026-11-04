// Figma screen "Student profile" — US-01 view my profile (and other students' profiles).
import { useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import { useAuth } from '../auth';
import { Link } from '../router';
import Page from '../components/Page';
import Avatar from '../components/Avatar';
import { isFilled, LEVELS, PROFILE_FIELDS, profileCompletion } from '../utils';

const levelLabel = Object.fromEntries(LEVELS.map((l) => [l.value, l.label]));

export default function ProfilePage({ userId }) {
  const { user } = useAuth();
  const id = userId || user.id;
  const isMe = id === user.id;

  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setProfile(null);
    setError('');
    Promise.all([api.getUser(id), api.getCategories()])
      .then(([p, cats]) => {
        setProfile(p);
        setCategories(cats);
      })
      .catch((e) => setError(e.code === 'USER_NOT_FOUND' ? 'This student does not exist.' : e.message));
  }, [id]);

  const categoryName = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  if (error) {
    return (
      <Page>
        <div className="alert error" role="alert">
          {error}
        </div>
        <Link to="/" className="btn">
          ← Back home
        </Link>
      </Page>
    );
  }
  if (!profile) return <div className="spinner">Loading profile…</div>;

  const teach = profile.skills.filter((s) => s.type === 'teach');
  const learn = profile.skills.filter((s) => s.type === 'learn');
  const missing = PROFILE_FIELDS.filter((f) => !isFilled(profile[f.key]));
  const completion = profileCompletion(profile, profile.skills);
  const subtitle = [profile.faculty, profile.year && `Year ${profile.year}`]
    .filter(Boolean)
    .join(' · ');

  const show = (value) =>
    isFilled(value) ? value : <span className="missing">{isMe ? 'Not filled in' : '—'}</span>;

  return (
    <Page>
      <div className="breadcrumb">
        <Link to="/">Home</Link> / <b>{isMe ? 'My profile' : profile.name}</b>
      </div>

      <div className="profile-grid">
        <aside className="card profile-card">
          <Avatar name={profile.name} size={80} />
          <h3>{profile.name}</h3>
          <div className="muted">{subtitle || (isMe ? 'School and year not set' : '')}</div>
          <div className="muted">{profile.university}</div>

          <div className="stat-box">
            <strong>{isMe ? `${completion}%` : profile.skills.length}</strong>
            <span className="small-caps">{isMe ? 'Profile complete' : 'Skills listed'}</span>
          </div>

          {isMe ? (
            <>
              {missing.length > 0 || teach.length === 0 || learn.length === 0 ? (
                <Link to={missing.length > 0 ? '/setup' : '/skills'} className="btn primary block">
                  Complete profile
                </Link>
              ) : (
                <Link to="/setup" className="btn primary block">
                  Edit profile
                </Link>
              )}
              <Link to="/skills" className="btn block" style={{ marginTop: 12 }}>
                Edit skills
              </Link>
            </>
          ) : (
            <p className="muted">Contact details are revealed after you choose to connect (Sprint 2).</p>
          )}
        </aside>

        <section>
          <span className="eyebrow plain">05 · Student profile</span>
          <h2 style={{ marginTop: 4 }}>{isMe ? 'My profile' : `About ${profile.name.split(' ')[0]}`}</h2>

          {isMe && missing.length > 0 && (
            <div className="alert info section-gap" data-testid="missing-alert">
              <span className="dot" />
              <span>
                Missing: <b>{missing.map((m) => m.label).join(', ')}</b>. Complete your profile so other
                students know who they are swapping skills with.
              </span>
            </div>
          )}

          <div className="panel white section-gap">
            <dl className="info-list">
              <dt>Full name</dt>
              <dd>{show(profile.name)}</dd>
              <dt>University</dt>
              <dd>{show(profile.university)}</dd>
              <dt>School</dt>
              <dd>{show(profile.faculty)}</dd>
              <dt>Year</dt>
              <dd>{show(profile.year && `Year ${profile.year}`)}</dd>
              <dt>About</dt>
              <dd>{show(profile.bio)}</dd>
            </dl>
          </div>

          <div className="panel mint section-gap">
            <div className="small-caps" style={{ marginBottom: 8 }}>
              {isMe ? 'I can teach' : `${profile.name.split(' ')[0]} can teach`}
            </div>
            <SkillChips skills={teach} categoryName={categoryName} empty={isMe ? 'No teaching skills yet' : '—'} />
            <hr className="divider" />
            <div className="small-caps" style={{ marginBottom: 8 }}>
              {isMe ? 'I want to learn' : `${profile.name.split(' ')[0]} wants to learn`}
            </div>
            <SkillChips skills={learn} categoryName={categoryName} empty={isMe ? 'No learning skills yet' : '—'} />
          </div>
        </section>
      </div>
    </Page>
  );
}

function SkillChips({ skills, categoryName, empty }) {
  if (skills.length === 0) return <span className="missing">{empty}</span>;
  return (
    <div className="chips">
      {skills.map((s) => (
        <span key={s.id} className="chip static" title={categoryName[s.category_id]}>
          {s.name} · <span className="muted">{levelLabel[s.level]}</span>
        </span>
      ))}
    </div>
  );
}
