// The strip shown during the 5 seconds: what happened + Undo with a countdown.
export default function UndoStrip({ label, seconds, onUndo }) {
  return (
    <div className="undo-strip" role="status" data-testid="undo-strip">
      <span>{label}</span>
      <button className="btn small" onClick={onUndo}>
        Undo ({seconds})
      </button>
    </div>
  );
}
