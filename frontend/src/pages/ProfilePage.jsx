// Figma screen "Student profile" — US-01 view my profile (and other students' profiles).
import { useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import { useAuth } from '../auth';
import { Link } from '../router';
import Page from '../components/Page';
import Avatar from '../components/Avatar';
import UndoStrip from '../components/UndoStrip';
import { useUndo } from '../useUndo';
import { isFilled, LEVELS, PROFILE_FIELDS, profileCompletion } from '../utils';

const levelLabel = Object.fromEntries(LEVELS.map((l) => [l.value, l.label]));

export default function ProfilePage({ userId }) {
  const { user } = useAuth();
  const id = userId || user.id;
  const isMe = id === user.id;

  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [contacts, setContacts] = useState(null); // My contacts, loaded together with the page
  const [error, setError] = useState('');

  useEffect(() => {
    setProfile(null);
    setError('');
    // Everything the page shows is loaded at once, so nothing pops in later.
    Promise.all([
      api.getUser(id, { fresh: !isMe }),
      api.getCategories(),
      isMe ? api.getContactRequests({ fresh: true }) : Promise.resolve(null)
    ])
      .then(([p, cats, c]) => {
        setContacts(c);
        setCategories(cats);
        setProfile(p);
      })
      .catch((e) => setError(e.code === 'USER_NOT_FOUND' ? 'This student does not exist.' : e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Reload the profile after sending / answering a contact request.
  const reload = () =>
    api
      .getUser(id, { fresh: true })
      .then(setProfile)
      .catch((e) => setError(e.message));

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
        <Link to="/">Home</Link> / {!isMe && <><Link to="/">Matches</Link> / </>}
        <b>{isMe ? 'My profile' : profile.name}</b>
      </div>

      <div className="profile-grid">
        <aside className="card profile-card">
          <Avatar name={profile.name} size={80} />
          <h3>{profile.name}</h3>
          {profile.university && <div className="muted">{profile.university}</div>}
          {subtitle && <div className="muted">{subtitle}</div>}

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
                Contact: <b>{profile.contact_available ? 'visible to students' : 'shared on request'}</b>
                {' · '}
                <Link to="/setup" className="link-btn">
                  change
                </Link>
              </p>
            </>
          ) : (
            <ContactBox profile={profile} onChange={reload} />
          )}
        </aside>

        <section>
          <h2 style={{ marginTop: 0 }}>{isMe ? 'My profile' : `About ${profile.name.split(' ')[0]}`}</h2>

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

          {isMe && contacts && <MyContacts initial={contacts} />}
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

// US-10: open a student's Telegram/WhatsApp.
// US-11: shared publicly -> Contact button right away.
// US-12: hidden -> Request contact; the owner accepts or declines (mutual match only highlights it).
function ContactBox({ profile, onChange }) {
  const [contact, setContact] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const firstName = profile.name.split(' ')[0];
  const req = profile.contact_request;
  const undo = useUndo(5000);

  // Accept: at once. Decline: 5 seconds to undo before it is sent.
  const answerLater = (status) =>
    status === 'accepted'
      ? act(() => api.answerContactRequest(req.id, 'accepted'))
      : undo.start(
      req.id,
      status === 'accepted' ? `You accepted ${firstName}'s request` : `You declined ${firstName}'s request`,
      () => act(() => api.answerContactRequest(req.id, status))
    );

  const act = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      api.announceRequestsChanged();
      await onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const errorBox = error && (
    <div className="alert error section-gap" role="alert" style={{ textAlign: 'left' }}>
      {error}
    </div>
  );

  if (!profile.contact_available) {
    if (!profile.has_contact) {
      return (
        <p className="muted" data-testid="contact-hidden">
          {firstName} has not added contact details yet.
        </p>
      );
    }

    // They asked for MY contact: answer right here.
    if (req && req.direction === 'incoming' && req.status === 'pending') {
      if (undo.items[req.id]) {
        return (
          <UndoStrip label={undo.items[req.id].label} seconds={undo.secondsLeft(req.id)} onUndo={() => undo.undo(req.id)} />
        );
      }
      return (
        <div className="panel white request-box" data-testid="contact-incoming">
          <b>{firstName} asked for your contact</b>
          {req.message && <p className="request-message">“{req.message}”</p>}
          <p className="muted" style={{ marginTop: 6 }}>
            If you accept, you will both see each other&apos;s contacts.
          </p>
          <div className="row-gap">
            <button className="btn primary small" disabled={busy} onClick={() => answerLater('accepted')}>
              Accept
            </button>
            <button className="btn small" disabled={busy} onClick={() => answerLater('declined')}>
              Decline
            </button>
          </div>
          {errorBox}
        </div>
      );
    }

    if (req && req.direction === 'outgoing' && req.status === 'pending') {
      return (
        <div className="panel white request-box" data-testid="contact-pending">
          <b>Request sent</b>
          <p className="muted" style={{ marginTop: 6 }}>
            Waiting for {firstName} to accept. You will see the contact here.
          </p>
          <button className="btn small" disabled={busy} onClick={() => act(() => api.cancelContactRequest(req.id))}>
            {busy ? 'Cancelling…' : 'Cancel request'}
          </button>
          {errorBox}
        </div>
      );
    }

    // After a decline: one more request is allowed 3 days later (2 attempts in total).
    let retryNote = null;
    if (req && req.status === 'declined' && req.direction === 'outgoing') {
      if (req.final) {
        return (
          <p className="muted" data-testid="contact-declined">
            Contact is not available.
          </p>
        );
      }
      if (!req.can_retry) {
        const day = new Date(req.retry_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        return (
          <p className="muted" data-testid="contact-declined">
            You can send a new request from {day}.
          </p>
        );
      }
      retryNote = 'You can send one more request.';
    }
    if (req && req.status === 'declined' && req.direction === 'incoming') {
      retryNote = `You declined ${firstName}'s request earlier. You can still ask for their contact.`;
    }

    return (
      <div className="request-box" data-testid="contact-request-form">
        {profile.mutual_match && (
          <div style={{ marginBottom: 10 }}>
            <span className="match-badge mutual">Mutual match — you can help each other</span>
          </div>
        )}
        <p className="muted" style={{ marginTop: 0 }}>
          {firstName} shares contact details only after accepting a request.
        </p>
        {retryNote && (
          <div className="alert info" style={{ marginBottom: 10 }}>
            <span>{retryNote}</span>
          </div>
        )}
        <textarea
          className="textarea"
          placeholder={`Hi ${firstName}! I would like to learn… I can help with…`}
          value={message}
          maxLength={200}
          onChange={(e) => setMessage(e.target.value)}
          style={{ minHeight: 64 }}
          aria-label="Message (optional)"
        />
        <div className="muted" style={{ textAlign: 'right' }}>{message.length}/200</div>
        <button
          className="btn primary block"
          disabled={busy}
          onClick={() => act(() => api.sendContactRequest(profile.id, message.trim()))}
        >
          {busy ? 'Sending…' : 'Request contact'}
        </button>
        {errorBox}
      </div>
    );
  }

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      setContact(await api.getContact(profile.id));
    } catch (e) {
      setError(e.code === 'CONTACT_HIDDEN' ? `${firstName} has hidden their contact.` : e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!contact) {
    return (
      <>
        {req?.status === 'accepted' ? (
          <p className="muted" style={{ marginTop: 0 }}>
            ✓ Contact request accepted
          </p>
        ) : (
          profile.offered_help &&
          !profile.contact_public && (
            <p className="muted" style={{ marginTop: 0 }} data-testid="offered-help">
              ✓ {firstName} offered to help with your request
            </p>
          )
        )}
        <button className="btn primary block" onClick={load} disabled={busy}>
          {busy ? 'Loading…' : 'Contact'}
        </button>
        {errorBox}
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

// US-12: everyone I exchanged contacts with, my sent requests and their answers.
function MyContacts({ initial }) {
  const [data, setData] = useState(initial);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState([]); // notifications closed with ✕
  const undo = useUndo(5000);

  // ✕ on a contact: removed for both students after 5 seconds unless undone.
  const remove = (c) =>
    undo.start(c.request_id, `${c.user.name} removed from your contacts`, async () => {
      try {
        await api.removeContact(c.request_id);
      } catch (e) {
        setError(e.message);
      }
      api.announceRequestsChanged();
      load();
    });

  // Opening this page = the new answers are seen (the badge on Profile goes away).
  const markSeen = (d) => {
    if (d.unseen > 0) {
      api
        .markContactAnswersSeen()
        .then(api.announceRequestsChanged)
        .catch(() => {});
    }
  };

  const load = () =>
    api
      .getContactRequests({ fresh: true })
      .then((d) => {
        setData(d);
        markSeen(d);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    markSeen(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancel = async (id) => {
    setBusyId(id);
    setError('');
    try {
      await api.cancelContactRequest(id);
      api.announceRequestsChanged();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <div className="alert error section-gap" role="alert">
        {error}
      </div>
    );
  }
  if (!data) return null;

  const fresh = data.outgoing.filter((r) => r.is_new && !hidden.includes(r.id));
  const waiting = data.outgoing.filter((r) => r.status === 'pending');
  const subtitle = (u) => [u.faculty, u.year && `Year ${u.year}`].filter(Boolean).join(' · ');
  const nothing =
    data.contacts.length === 0 && waiting.length === 0 && fresh.length === 0;

  return (
    <div className="panel white section-gap" data-testid="my-contacts">
      <h3 style={{ marginTop: 0 }}>My contacts</h3>

      {data.incoming.length > 0 && (
        <div className="alert info" style={{ marginBottom: 12 }}>
          <span className="dot" />
          <span>
            {data.incoming.length} {data.incoming.length === 1 ? 'student is' : 'students are'} waiting for your
            answer ·{' '}
            <Link to="/" className="link-btn">
              Answer on Home
            </Link>
          </span>
        </div>
      )}

      {fresh.map((r) => (
        <div key={r.id} className={`alert ${r.status === 'accepted' ? 'success' : 'info'}`} style={{ marginBottom: 12 }}>
          <span>
            {r.status === 'accepted' ? '✓ ' : ''}
            <b>{r.to.name}</b> {r.status === 'accepted' ? 'accepted' : 'declined'} your contact request
            {r.status === 'accepted' && (
              <>
                {' · '}
                <Link to={`/users/${r.to.id}`} className="link-btn">
                  Open contact
                </Link>
              </>
            )}
          </span>
          <button
            className="icon-btn"
            aria-label="Close"
            title="Close"
            onClick={() => setHidden((h) => [...h, r.id])}
          >
            ×
          </button>
        </div>
      ))}

      {nothing && (
        <p className="muted" style={{ margin: 0 }}>
          No contacts yet. Open a student&apos;s profile and press Contact or Request contact.
        </p>
      )}

      {data.contacts.length > 0 && (
        <>
          <div className="small-caps" style={{ margin: '4px 0 6px' }}>
            Contacts · {data.contacts.length}
          </div>
          {data.contacts.map((c) =>
            undo.items[c.request_id] ? (
              <UndoStrip
                key={c.request_id}
                label={undo.items[c.request_id].label}
                seconds={undo.secondsLeft(c.request_id)}
                onUndo={() => undo.undo(c.request_id)}
              />
            ) : (
              <div key={c.request_id} className="contact-row contact-row-x" data-testid="contact-row">
                <Avatar name={c.user.name} size={32} />
                <div className="contact-request-body">
                  <b>{c.user.name}</b>
                  <div className="muted">{subtitle(c.user)}</div>
                </div>
                <Link to={`/users/${c.user.id}`} className="btn small">
                  Open contact
                </Link>
                <button
                  className="icon-btn"
                  aria-label={`Remove ${c.user.name} from contacts`}
                  title="Remove from contacts"
                  onClick={() => remove(c)}
                >
                  ×
                </button>
              </div>
            )
          )}
        </>
      )}

      {waiting.length > 0 && (
        <>
          <div className="small-caps" style={{ margin: '14px 0 6px' }}>
            Waiting for an answer · {waiting.length}
          </div>
          {waiting.map((r) => (
            <div key={r.id} className="contact-row">
              <Avatar name={r.to.name} size={32} />
              <div className="contact-request-body">
                <Link to={`/users/${r.to.id}`} className="link-btn">
                  <b>{r.to.name}</b>
                </Link>
                <div className="muted">Request sent</div>
              </div>
              <button className="btn small" disabled={busyId === r.id} onClick={() => cancel(r.id)}>
                Cancel
              </button>
            </div>
          ))}
        </>
      )}

    </div>
  );
}
