// Page wrapper with the decorative circles from the Figma design.
const LAYOUTS = {
  auth: [
    { c: 'yellow', s: 320, top: -140, left: -120 },
    { c: 'lime', s: 260, top: -90, right: -40 },
    { c: 'peach', s: 280, bottom: -160, left: -60 },
    { c: 'lime', s: 240, bottom: -80, right: -30 }
  ],
  setup: [
    { c: 'yellow', s: 300, top: -120, left: -80 },
    { c: 'lime', s: 220, top: -70, right: -20 },
    { c: 'orange', s: 260, bottom: -110, left: -40 },
    { c: 'green', s: 200, bottom: 40, right: -60 }
  ],
  app: [
    { c: 'yellow', s: 260, top: -120, left: -100 },
    { c: 'lime', s: 240, top: -90, right: -60 },
    { c: 'peach', s: 260, bottom: -140, left: -80 },
    { c: 'lime', s: 200, bottom: -60, right: -40 }
  ]
};

export default function Page({ variant = 'app', children }) {
  return (
    <main className="page">
      {LAYOUTS[variant].map((b, i) => {
        const { c, s, ...pos } = b;
        return <span key={i} className={`blob ${c}`} style={{ width: s, height: s, ...pos }} />;
      })}
      <div className="page-inner">{children}</div>
    </main>
  );
}
