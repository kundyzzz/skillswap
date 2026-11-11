// Figma screen "Profile setup" (step 1 of 2) — US-02 fill in profile, US-11 contact.
import { useEffect, useState } from 'react';
import * as api from '../api';
import { useAuth } from '../auth';
import { Link, navigate } from '../router';
import Page from '../components/Page';
import Avatar from '../components/Avatar';
import { isFilled, PROFILE_FIELDS } from '../utils';

const FACULTIES = [
  'School of Information Technology and Engineering',
  'Business School',
  'International School of Economics',
  'School of Applied Mathematics',
  'School of Energy and Oil & Gas Industry',
  'School of Geology',
  'School of Chemical Engineering',
  'School of Materials Science and Green Technologies',
  'School of Natural and Social Sciences',
  'Kazakhstan Maritime Academy',
  'Other'
];

const BIO_LIMIT = 500;

export default function ProfileSetup() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    university: '',
    faculty: '',
    year: '',
    bio: '',
    contactApp: 'telegram',
    contact: '',
    showContact: false
  });
  const [saved, setSaved] = useState({ telegram: '', whatsapp: '' }); // contacts already in the database
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getMyProfile()
      .then((p) => {
        if (!alive) return;
        const telegram = p.telegram || '';
        const whatsapp = p.whatsapp || '';
        const contactApp = !telegram && whatsapp ? 'whatsapp' : 'telegram';
        setSaved({ telegram, whatsapp });
        setForm((f) => ({
          ...f,
          name: p.name || '',
          university: p.university || '',
          faculty: p.faculty || '',
          year: p.year ? String(p.year) : '',
          bio: p.bio || '',
          contactApp,
          contact: contactApp === 'telegram' ? telegram : whatsapp,
          showContact: Boolean(p.show_contact)
        }));
      })
      .catch((e) => alive && setServerError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [user.id]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  // Switching Telegram <-> WhatsApp shows the contact already saved for that app.
  const setContactApp = (e) => {
    const contactApp = e.target.value;
    setForm({ ...form, contactApp, contact: saved[contactApp] || '' });
  };

  const hasAnyContact = Boolean(form.contact.trim() || saved.telegram || saved.whatsapp);

  const filled = PROFILE_FIELDS.filter((f) => isFilled(form[f.key])).length;
  const percent = Math.round((filled / PROFILE_FIELDS.length) * 50); // step 1 = first 50%

  // Accepts a username/number or a pasted link (t.me/..., wa.me/...) and keeps only the part we store.
  const cleanContact = () => {
    let value = form.contact.trim();
    if (form.contactApp === 'telegram') {
      value = value.replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\//i, '').replace(/[/?].*$/, '');
    } else {
      value = value.replace(/^(https?:\/\/)?(www\.)?(wa\.me|api\.whatsapp\.com\/send\?phone=)\/?/i, '');
      value = value.replace(/[\s()-]/g, '');
    }
    return value;
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Full name is required';
    if (!form.year) next.year = 'Please choose your year of study';
    if (form.bio.length > BIO_LIMIT) next.bio = `About me must be ${BIO_LIMIT} characters or less`;
    const contact = cleanContact();
    if (contact) {
      if (form.contactApp === 'telegram' && !/^@?[A-Za-z0-9_]{5,32}$/.test(contact)) {
        next.contact = 'Telegram username: 5–32 letters, numbers or _';
      }
      if (form.contactApp === 'whatsapp' && !/^\+?[0-9]{10,15}$/.test(contact)) {
        next.contact = 'WhatsApp number: 10–15 digits, e.g. +77001234567';
      }
    }
    // US-11 AC3: sharing needs a saved contact
    if (form.showContact && !hasAnyContact) {
      next.showContact = 'Add a Telegram username or WhatsApp number first';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setBusy(true);

    const body = {
      name: form.name.trim(),
      university: form.university.trim(),
      faculty: form.faculty,
      year: Number(form.year),
      bio: form.bio.trim(),
      show_contact: form.showContact
    };
    // Contact is sent only when typed, so an empty field never wipes a saved contact.
    const contact = cleanContact();
    if (contact) {
      if (form.contactApp === 'telegram') body.telegram = contact.startsWith('@') ? contact : `@${contact}`;
      else body.whatsapp = contact;
    }

    try {
      const updated = await api.updateMe(body);
      setUser({ ...user, name: updated.name });
      navigate('/skills');
    } catch (err) {
      if (err.code === 'CONTACT_REQUIRED') {
        setErrors((prev) => ({ ...prev, showContact: err.message }));
      } else {
        setServerError(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="spinner">Loading your profile…</div>;

  return (
    <Page variant="setup">
      <div className="setup-grid">
        <section>
          <span className="eyebrow">Your profile</span>
          <h2 style={{ fontSize: 30, marginTop: 14, lineHeight: 1.2 }}>
            Help your matches know who they are meeting.
          </h2>
          <ol className="steps">
            <li className="current">
              <span className="step-num">1</span> Basic details
            </li>
            <li>
              <span className="step-num">2</span> Skills and interests
            </li>
          </ol>
        </section>

        <form className="card" onSubmit={submit} noValidate>
          <div className="space-between small-caps">
            <span>Step 1 of 2</span>
            <span>{percent}% complete</span>
          </div>
          <div className="progress" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>

          <h2>Set up your profile</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Add the details other students will see before connecting with you.
          </p>

          {serverError && (
            <div className="alert error" role="alert">
              {serverError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0' }}>
            <Avatar name={form.name || user.name} size={56} color="orange" />
            <span className="muted">Your initials are shown as your avatar.</span>
          </div>

          <div className="field">
            <label htmlFor="ps-name">Full name</label>
            <input
              id="ps-name"
              className={`input ${errors.name ? 'invalid' : ''}`}
              value={form.name}
              onChange={set('name')}
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="ps-university">University</label>
              <input
                id="ps-university"
                className="input"
                placeholder="KBTU"
                value={form.university}
                onChange={set('university')}
              />
            </div>
            <div className="field">
              <label htmlFor="ps-year">Year of study</label>
              <select
                id="ps-year"
                className={`select ${errors.year ? 'invalid' : ''}`}
                value={form.year}
                onChange={set('year')}
              >
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5, 6, 7].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
              {errors.year && <div className="field-error">{errors.year}</div>}
            </div>
          </div>

          <div className="field">
            <label htmlFor="ps-faculty">School</label>
            <select id="ps-faculty" className="select" value={form.faculty} onChange={set('faculty')}>
              <option value="">Select your school</option>
              {[...new Set([...FACULTIES, form.faculty].filter(Boolean))].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="ps-bio">About me</label>
            <textarea
              id="ps-bio"
              className={`textarea ${errors.bio ? 'invalid' : ''}`}
              placeholder="What do you study, and how do you like to learn?"
              value={form.bio}
              onChange={set('bio')}
            />
            <div className="muted" style={{ textAlign: 'right' }}>
              {form.bio.length}/{BIO_LIMIT}
            </div>
            {errors.bio && <div className="field-error">{errors.bio}</div>}
          </div>

          <div className="row narrow-first">
            <div className="field">
              <label htmlFor="ps-app">Contact app</label>
              <select id="ps-app" className="select" value={form.contactApp} onChange={setContactApp}>
                <option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ps-contact">Telegram / WhatsApp contact</label>
              <input
                id="ps-contact"
                className={`input ${errors.contact ? 'invalid' : ''}`}
                placeholder={form.contactApp === 'telegram' ? '@username or t.me/username' : '+77001234567 or wa.me/77001234567'}
                value={form.contact}
                onChange={set('contact')}
              />
              {errors.contact && <div className="field-error">{errors.contact}</div>}
            </div>
          </div>

          <label className="checkbox" style={{ marginBottom: 6 }}>
            <input
              id="ps-show-contact"
              type="checkbox"
              checked={form.showContact}
              onChange={(e) => {
                setForm({ ...form, showContact: e.target.checked });
                setErrors((prev) => ({ ...prev, showContact: undefined }));
              }}
            />
            <span>
              <b>Show my contact</b> to other students
            </span>
          </label>
          {errors.showContact && (
            <div className="field-error" style={{ marginTop: -4, marginBottom: 12 }} role="alert">
              {errors.showContact}
            </div>
          )}

          <div className="alert info">
            <span className="dot" />
            <span>
              {form.showContact
                ? 'Other students will see a Contact button on your profile and can open your Telegram/WhatsApp.'
                : 'Your contact is hidden. Turn on “Show my contact” when you are ready to be contacted.'}
            </span>
          </div>

          <div className="space-between" style={{ marginTop: 8 }}>
            <Link to="/profile" className="link-btn">
              ← Back
            </Link>
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Continue to skills'}
            </button>
          </div>
        </form>
      </div>
    </Page>
  );
}
