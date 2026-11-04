import { initials } from '../utils';

export default function Avatar({ name, size = 40, color = 'yellow' }) {
  return (
    <span
      className={`avatar ${color}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
