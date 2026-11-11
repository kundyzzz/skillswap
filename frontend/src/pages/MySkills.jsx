// Figma screen "My skills" — US-03 teach, US-04 learn, US-05 categories.
import { useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import { useAuth } from '../auth';
import { navigate } from '../router';
import Page from '../components/Page';
import { LEVELS, profileCompletion } from '../utils';

export default function MySkills() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [allSkills, setAllSkills] = useState([]); // whole directory, for search
  const [mySkills, setMySkills] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMine = () => api.getMySkills().then(setMySkills);

  useEffect(() => {
    // 4 requests in parallel (before: 3 + one more per category, one after another).
    Promise.all([api.getCategories(), api.getMySkills(), api.getUser(user.id), api.getAllSkills()])
      .then(([cats, mine, prof, skills]) => {
        setCategories(cats);
        setMySkills(mine);
        setProfile(prof);
        setAllSkills(skills);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <div className="spinner">Loading skills…</div>;

  const completion = profileCompletion(profile, mySkills);

  return (
    <Page variant="app">
      <div className="space-between" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">My skills</h1>
          <p className="muted" style={{ margin: 0 }}>
            Choose at least one skill in each section so we can find useful exchanges for you.
          </p>
        </div>
        <span className="badge">Profile completion: {completion}%</span>
      </div>

      {error && (
        <div className="alert error section-gap" role="alert">
          {error}
        </div>
      )}

      <div className="skills-grid">
        <SkillPanel
          type="teach"
          title="I can teach"
          subtitle="Skills you feel comfortable helping another student practise."
          tone="mint"
          categories={categories}
          allSkills={allSkills}
          mySkills={mySkills}
          onChange={loadMine}
        />
        <SkillPanel
          type="learn"
          title="I want to learn"
          subtitle="Skills you would like to explore with help from another student."
          tone="butter"
          categories={categories}
          allSkills={allSkills}
          mySkills={mySkills}
          onChange={loadMine}
        />
      </div>

      <div className="space-between section-gap" style={{ flexWrap: 'wrap' }}>
        <span className="muted">Changes are saved to your profile automatically.</span>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" onClick={() => navigate('/profile')}>
            View my profile
          </button>
          <button className="btn primary" onClick={() => navigate('/')}>
            Find matches
          </button>
        </div>
      </div>
    </Page>
  );
}

function SkillPanel({ type, title, subtitle, tone, categories, allSkills, mySkills, onChange }) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || null);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('intermediate');
  const [message, setMessage] = useState(null); // { kind, text }
  const [busyId, setBusyId] = useState(null);

  const categoryName = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  const selected = mySkills.filter((s) => s.type === type);
  const selectedIds = new Set(selected.map((s) => s.skill_id));

  // Search across all categories; otherwise show the chosen category.
  const q = query.trim().toLowerCase();
  const visible = q
    ? allSkills.filter(
        (s) => s.name.toLowerCase().includes(q) || categoryName[s.category_id]?.toLowerCase().includes(q)
      )
    : allSkills.filter((s) => s.category_id === activeCategory);

  const flash = (kind, text) => {
    setMessage({ kind, text });
    window.clearTimeout(flash.t);
    flash.t = window.setTimeout(() => setMessage(null), 3500);
  };

  const add = async (skill) => {
    if (selectedIds.has(skill.id)) {
      flash('error', `"${skill.name}" is already added`);
      return;
    }
    setBusyId(skill.id);
    try {
      await api.addMySkill(skill.id, type, level);
      await onChange();
      flash('success', `"${skill.name}" added`);
    } catch (e) {
      flash('error', e.code === 'SKILL_EXISTS' ? 'Already added' : e.message);
    } finally {
      setBusyId(null);
    }
  };

  const changeLevel = async (userSkill, newLevel) => {
    setBusyId(userSkill.id);
    try {
      await api.updateMySkill(userSkill.id, { level: newLevel });
      await onChange();
    } catch (e) {
      flash('error', e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (userSkill) => {
    setBusyId(userSkill.id);
    try {
      await api.deleteMySkill(userSkill.id);
      await onChange();
      flash('success', `"${userSkill.name}" removed`);
    } catch (e) {
      flash('error', e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={`panel ${tone}`} aria-label={title} data-testid={`panel-${type}`}>
      <h3>{title}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        {subtitle}
      </p>

      <input
        className="input"
        placeholder="Search skills or categories…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={`Search skills to ${type}`}
      />

      {!q && (
        <>
          <div className="small-caps section-gap" style={{ marginBottom: 8 }}>
            Browse categories
          </div>
          <div className="chips">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${activeCategory === c.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(c.id)}
                aria-pressed={activeCategory === c.id}
              >
                {activeCategory === c.id && '✓ '}
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="space-between section-gap" style={{ marginBottom: 8 }}>
        <span className="small-caps">{q ? 'Search results' : 'Skills in this category'}</span>
        <label className="muted" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          Level
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="select"
            style={{ width: 'auto', padding: '3px 8px', fontSize: 12 }}
            aria-label={`Level for new ${type} skills`}
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chips">
        {visible.length === 0 && <span className="muted">No skills found.</span>}
        {visible.map((s) => {
          const added = selectedIds.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              className={`chip ${added ? 'added' : ''}`}
              onClick={() => add(s)}
              disabled={busyId === s.id}
              title={added ? 'Already added' : `Add ${s.name}`}
            >
              {added ? '✓' : '+'} {s.name}
              {q && <span className="muted"> · {categoryName[s.category_id]}</span>}
            </button>
          );
        })}
      </div>

      {message && (
        <div className={`alert ${message.kind} section-gap`} role="status" style={{ marginBottom: 0 }}>
          {message.text}
        </div>
      )}

      <div className="space-between section-gap" style={{ marginBottom: 8 }}>
        <span className="small-caps">Selected skills</span>
        <span className="small-caps">{selected.length} added</span>
      </div>

      <div className="skill-list">
        {selected.length === 0 && <div className="empty">No skills yet — pick one above.</div>}
        {selected.map((s) => (
          <div className="skill-row" key={s.id}>
            <span className="name">
              {s.name}
              <span className="cat">{categoryName[s.category_id]}</span>
            </span>
            <select
              value={s.level}
              onChange={(e) => changeLevel(s, e.target.value)}
              disabled={busyId === s.id}
              aria-label={`Level for ${s.name}`}
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="link-btn"
              onClick={() => remove(s)}
              disabled={busyId === s.id}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
