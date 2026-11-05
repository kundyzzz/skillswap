// Card from the Figma "Home matches" screen. Used on Home (matches) and Search.
import { Link } from '../router';
import Avatar from './Avatar';

const TONES = ['peach', 'mint', 'lilac'];
const AVATAR = { peach: 'orange', mint: 'green', lilac: 'yellow' };

export default function StudentCard({ student, index = 0, badge, teachLabel, teaches, wants }) {
  const tone = TONES[index % TONES.length];
  const subtitle = [student.faculty, student.year && `Year ${student.year}`].filter(Boolean).join(' · ');

  return (
    <article className={`card student-card ${tone}`} data-testid="student-card">
      <div className="student-head">
        <Avatar name={student.name} size={44} color={AVATAR[tone]} />
        <div className="student-name">
          <h3>{student.name}</h3>
          <div className="muted">{subtitle || student.university || 'Student'}</div>
        </div>
        {badge && <span className={`match-badge ${badge.kind}`}>{badge.text}</span>}
      </div>

      <div className="small-caps section-gap">{teachLabel}</div>
      <div className="chips" style={{ marginTop: 6 }}>
        {teaches.map((name) => (
          <span key={name} className="chip static">
            {name}
          </span>
        ))}
      </div>

      {wants && wants.length > 0 && (
        <>
          <div className="small-caps section-gap">Wants to learn from you</div>
          <div className="chips" style={{ marginTop: 6 }}>
            {wants.map((name) => (
              <span key={name} className="chip static">
                {name}
              </span>
            ))}
          </div>
        </>
      )}

      {student.bio && <p className="student-bio">{student.bio}</p>}

      <div className="student-foot">
        {student.contact_available && <span className="muted">● Contact available</span>}
        <Link to={`/users/${student.id}`} className="btn primary block">
          View profile
        </Link>
      </div>
    </article>
  );
}
