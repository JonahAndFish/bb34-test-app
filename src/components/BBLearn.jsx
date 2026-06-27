import { useState } from 'react';

function renderContent(text) {
  // Convert **bold**, > blockquote lines, and \n to formatted JSX
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const isQuote = line.startsWith('> ');
    const content = isQuote ? line.slice(2) : line;
    const parts = content.split(/\*\*(.+?)\*\*/g).map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    );
    if (isQuote) {
      return <div key={i} style={{ fontStyle: 'italic', borderLeft: '3px solid var(--gray-300)', paddingLeft: '.75rem', color: 'var(--gray-600)', margin: '.1rem 0' }}>{parts}</div>;
    }
    if (!content.trim()) return <div key={i} style={{ height: '.4rem' }} />;
    return <div key={i} style={{ marginBottom: '.1rem', lineHeight: 1.6 }}>{parts}</div>;
  });
}

export default function BBLearn({ sections }) {
  const [open, setOpen] = useState(null);
  const toggle = (id) => setOpen(open === id ? null : id);

  if (!sections) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '1rem 1.5rem 3rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '.25rem' }}>📖 Study Material</div>
        <div style={{ fontSize: '.85rem', color: 'var(--gray-500)' }}>Read each topic, then use the AI Tutor to ask questions before taking the test.</div>
      </div>

      {sections.map((sec) => (
        <div key={sec.id} className="card" style={{ marginBottom: '.75rem', padding: 0, overflow: 'hidden' }}>
          <button
            onClick={() => toggle(sec.id)}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
              <span style={{ fontSize: '1.3rem' }}>{sec.icon}</span>
              <div style={{ fontWeight: 700, fontSize: '.95rem' }}>{sec.title}</div>
            </div>
            <span style={{ fontSize: '1.1rem', color: 'var(--gray-400)', flexShrink: 0, marginLeft: '1rem' }}>{open === sec.id ? '▲' : '▼'}</span>
          </button>

          {open === sec.id && (
            <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--gray-100)' }}>
              {/* Main content */}
              <div style={{ fontSize: '.875rem', color: 'var(--gray-700)', margin: '1rem 0' }}>
                {renderContent(sec.content)}
              </div>

              {/* Key facts */}
              {sec.keyFacts?.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '.875rem', marginBottom: '.5rem' }}>🔑 Key Facts to Remember</div>
                  <div style={{ display: 'grid', gap: '.35rem' }}>
                    {sec.keyFacts.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: '.5rem', fontSize: '.85rem', background: 'var(--gray-50)', borderRadius: 6, padding: '.45rem .75rem' }}>
                        <span style={{ fontWeight: 700, minWidth: 160, color: 'var(--blue)', flexShrink: 0 }}>{f.label}</span>
                        <span style={{ color: 'var(--gray-700)' }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
