// "Undo within 5 seconds", like Telegram: the action is shown at once,
// but sent to the server only when the countdown ends. Undo = nothing is sent.
import { useCallback, useEffect, useRef, useState } from 'react';

export function useUndo(delayMs = 5000) {
  const [items, setItems] = useState({}); // id -> { label, deadline }
  const [, setTick] = useState(0);
  const timers = useRef({});
  const commits = useRef({});

  const forget = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    delete commits.current[id];
    setItems(({ [id]: _gone, ...rest }) => rest);
  }, []);

  const run = useCallback(
    (id) => {
      const commit = commits.current[id];
      forget(id);
      if (commit) commit();
    },
    [forget]
  );

  const start = useCallback(
    (id, label, commit) => {
      commits.current[id] = commit;
      timers.current[id] = setTimeout(() => run(id), delayMs);
      setItems((s) => ({ ...s, [id]: { label, deadline: Date.now() + delayMs } }));
    },
    [delayMs, run]
  );

  const undo = forget;

  // Redraw the countdown while something is waiting.
  const waiting = Object.keys(items).length > 0;
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setInterval(() => setTick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, [waiting]);

  // Leaving the page before the countdown ends keeps the decision.
  useEffect(
    () => () => {
      Object.keys(commits.current).forEach((id) => {
        clearTimeout(timers.current[id]);
        commits.current[id]();
      });
    },
    []
  );

  const secondsLeft = (id) =>
    items[id] ? Math.max(1, Math.ceil((items[id].deadline - Date.now()) / 1000)) : 0;

  return { items, start, undo, secondsLeft };
}
