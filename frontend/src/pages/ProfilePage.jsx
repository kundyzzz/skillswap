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
              <p className="muted" data-testid="my-contact-status" style={{ marginBottom: 0 }}>
                Contact: <b>{profile.contact_available ? 'visible to students' : 'hidden'}</b>
                {' · '}
                <Link to="/setup" className="link-btn">
                  change
                </Link>
              </p>
            </>
          ) : (
            <ContactBox userId={profile.id} name={profile.name} available={profile.contact_available} />
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

// US-10: open a student's Telegram/WhatsApp (only if they share it — US-11).
function ContactBox({ userId, name, available }) {
  const [contact, setContact] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const firstName = name.split(' ')[0];

  if (!available) {
    return (
      <p className="muted" data-testid="contact-hidden">
        {firstName} does not share contact details yet.
      </p>
    );
  }

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      setContact(await api.getContact(userId));
    } catch (e) {
      setError(e.code === 'CONTACT_HIDDEN' ? `${firstName} has hidden their contact.` : e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!contact) {
    return (
      <>
        <button className="btn primary block" onClick={load} disabled={busy}>
          {busy ? 'Loading…' : 'Contact'}
        </button>
        {error && (
          <div className="alert error section-gap" role="alert">
            {error}
          </div>
        )}
      </>
    );
  }

  const telegramUser = contact.telegram?.replace(/^@/, '');
  const whatsappNumber = contact.whatsapp?.replace(/[^0-9]/g, '');

  return (
    <div className="panel white" style={{ textAlign: 'left', padding: 16 }} data-testid="contact-box">
      <div className="small-caps" style={{ marginBottom: 10 }}>
        Preferred contact
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {telegramUser && (
          <a className="btn primary block" href={`https://t.me/${telegramUser}`} target="_blank" rel="noreferrer">
            Open Telegram @{telegramUser}
          </a>
        )}
        {whatsappNumber && (
          <a className="btn block" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
            Open WhatsApp +{whatsappNumber}
          </a>
        )}
      </div>
      <p className="muted" style={{ marginBottom: 0 }}>
        Meet in a public university space for your first exchange.
      </p>
    </div>
  );
}
