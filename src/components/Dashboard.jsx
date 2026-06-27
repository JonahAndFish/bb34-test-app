import { useState } from 'react';

const PASS_MARK = 76;

function calcMcq(answers, questions) {
  const mcqs = questions.filter(q => q.type === 'mcq');
  return mcqs.filter(q => answers?.[q.id] === q.answer).length * 2;
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ textAlign: 'center', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: color || 'var(--blue)' }}>{value}</div>
      <div style={{ fontWeight: 600, fontSize: '.9rem', marginTop: '.1rem' }}>{label}</div>
      {sub && <div style={{ fontSize: '.78rem', color: 'var(--gray-400)', marginTop: '.2rem' }}>{sub}</div>}
    </div>
  );
}

function Badge({ children, color }) {
  const colors = {
    green: { background: 'var(--green-light)', color: 'var(--green)' },
    red: { background: 'var(--red-light)', color: 'var(--red)' },
    blue: { background: 'var(--blue-light)', color: 'var(--blue)' },
    gray: { background: 'var(--gray-100)', color: 'var(--gray-600)' },
  };
  return (
    <span style={{ ...colors[color || 'gray'], padding: '.15rem .6rem', borderRadius: 20, fontSize: '.78rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export default function Dashboard({ submissions, questions, password, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [grading, setGrading] = useState({});
  const [localGrades, setLocalGrades] = useState({});
  const [deletedKeys, setDeletedKeys] = useState(new Set());
  const [showPin, setShowPin] = useState(false);

  if (!submissions?.length) {
    return <div className="empty-state"><p style={{ fontSize: '1.1rem' }}>No submissions yet.</p></div>;
  }

  // Enrich submissions — apply localGrades overlay to avoid blob race condition
  const enriched = submissions.filter(sub => !deletedKeys.has(sub._key)).map(sub => {
    const local = localGrades[sub._key];
    const mcqScore = local?.mcqScore ?? sub.mcqScore ?? calcMcq(sub.answers, questions);
    const writingTotal = local?.writingTotal ?? sub.writingTotal ?? null;
    const grades = local?.grades ?? sub.grades ?? null;
    const totalScore = writingTotal !== null ? mcqScore + writingTotal : null;
    return { ...sub, mcqScore, writingTotal, totalScore, grades, gradedAt: local ? new Date().toISOString() : sub.gradedAt };
  });

  // Group by student name, track attempt numbers
  const attemptMap = {};
  const sortedByTime = [...enriched].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  sortedByTime.forEach(sub => {
    const key = sub.studentName.toLowerCase();
    attemptMap[key] = (attemptMap[key] || 0) + 1;
    sub._attempt = attemptMap[key];
  });
  // Restore original sort order (newest first)
  const uniqueStudents = [...new Set(enriched.map(s => s.studentName.toLowerCase()))];

  const graded = enriched.filter(s => s.totalScore !== null);
  const avgMcq = enriched.reduce((a, s) => a + s.mcqScore, 0) / enriched.length;
  const avgTotal = graded.length ? graded.reduce((a, s) => a + s.totalScore, 0) / graded.length : null;
  const passed = graded.filter(s => s.totalScore >= PASS_MARK).length;

  const handleGrade = async (sub) => {
    setGrading(g => ({ ...g, [sub._key]: 'grading' }));
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-teacher-password': password },
        body: JSON.stringify({ key: sub._key }),
      });
      if (!res.ok) throw new Error(`Grade failed: ${res.status}`);
      const data = await res.json();
      // Apply grade data locally immediately — no blob propagation wait needed
      setLocalGrades(g => ({ ...g, [sub._key]: { grades: data.grades, writingTotal: data.writingTotal, mcqScore: data.mcqScore } }));
      setGrading(g => ({ ...g, [sub._key]: 'done' }));
      // Background sync
      setTimeout(() => onRefresh(), 1500);
    } catch (err) {
      setGrading(g => ({ ...g, [sub._key]: 'error' }));
      alert(`Grading failed: ${err.message}. Please try again.`);
    }
  };

  const handleDelete = async (sub) => {
    if (!window.confirm(`Delete ${sub.studentName}'s submission? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/delete-submission', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-teacher-password': password },
        body: JSON.stringify({ key: sub._key }),
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      // Optimistic update — remove from UI immediately
      setDeletedKeys(prev => new Set([...prev, sub._key]));
      setSelected(null);
      // Background sync after blob propagates
      setTimeout(() => onRefresh(), 2000);
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleGradeAll = async () => {
    const ungraded = enriched.filter(s => s.totalScore === null);
    for (const sub of ungraded) await handleGrade(sub);
  };

  const selectedSub = selected ? enriched.find(s => s._key === selected) : null;

  // --- Detail view ---
  if (selectedSub) {
    const mcqs = questions.filter(q => q.type === 'mcq');
    const writings = questions.filter(q => q.type === 'writing');
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={() => { setSelected(null); setShowPin(false); }}>← Back to dashboard</button>
          <button className="btn btn-danger" onClick={() => handleDelete(selectedSub)} style={{ fontSize: '.85rem' }}>🗑 Delete Record</button>
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>{selectedSub.studentName}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>
                Attempt #{selectedSub._attempt} · Submitted {new Date(selectedSub.submittedAt).toLocaleString()}
              </div>
              <div style={{ marginTop: '.4rem', display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.82rem' }}>
                <span style={{ color: 'var(--gray-400)' }}>PIN:</span>
                <span style={{ fontWeight: 600, letterSpacing: showPin ? '.15em' : 0 }}>
                  {showPin ? selectedSub.pin : '••••'}
                </span>
                <button
                  onClick={() => setShowPin(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)', fontSize: '.8rem', padding: 0 }}
                >
                  {showPin ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {selectedSub.totalScore !== null ? (
                <>
                  <Badge color={selectedSub.totalScore >= PASS_MARK ? 'green' : 'red'}>
                    {selectedSub.totalScore >= PASS_MARK ? 'PASS' : 'FAIL'}
                  </Badge>
                  <span style={{ fontWeight: 700, fontSize: '1.2rem' }}>{selectedSub.totalScore}/101</span>
                </>
              ) : (
                <button className="btn btn-primary" onClick={() => handleGrade(selectedSub)} disabled={grading[selectedSub._key] === 'grading'} style={{ fontSize: '.85rem', padding: '.4rem 1rem' }}>
                  {grading[selectedSub._key] === 'grading' ? '⏳ Grading...' : '✨ Grade Writing'}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <div><span style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>MCQ</span><div style={{ fontWeight: 700 }}>{selectedSub.mcqScore}/14</div></div>
            <div><span style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>Writing</span><div style={{ fontWeight: 700 }}>{selectedSub.writingTotal !== null ? `${selectedSub.writingTotal}/87` : '—'}</div></div>
            <div><span style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>Total</span><div style={{ fontWeight: 700 }}>{selectedSub.totalScore !== null ? `${selectedSub.totalScore}/101` : '—'}</div></div>
          </div>
        </div>

        {/* MCQ answers */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Section A — MCQ ({selectedSub.mcqScore}/14)</div>
          {mcqs.map((q, i) => {
            const student = selectedSub.answers?.[q.id];
            const correct = student === q.answer;
            return (
              <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '.6rem 0', borderBottom: i < mcqs.length - 1 ? '1px solid var(--gray-100)' : 'none', gap: '1rem' }}>
                <div style={{ fontSize: '.875rem', flex: 1 }}><span style={{ color: 'var(--gray-400)', marginRight: '.4rem' }}>Q{i + 1}.</span>{q.question}</div>
                <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
                  <Badge color={correct ? 'green' : student ? 'red' : 'gray'}>{student || '—'} {correct ? '✓' : student ? '✗' : ''}</Badge>
                  {!correct && <Badge color="green">Ans: {q.answer}</Badge>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Writing answers */}
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Section B — Writing ({selectedSub.writingTotal !== null ? `${selectedSub.writingTotal}/87` : 'Not graded'})</div>
          {writings.map((q, i) => {
            const grade = selectedSub.grades?.[q.id];
            const maxMarks = q.marks;
            return (
              <div key={q.id} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: i < writings.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                <div style={{ fontSize: '.85rem', color: 'var(--gray-600)', marginBottom: '.4rem' }}>
                  <strong>Q{i + 8}.</strong> {q.question}
                </div>
                <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '.75rem 1rem', fontSize: '.9rem', whiteSpace: 'pre-wrap', marginBottom: grade ? '.6rem' : 0 }}>
                  {selectedSub.answers?.[q.id] || <em style={{ color: 'var(--gray-400)' }}>No answer</em>}
                </div>
                {grade && (
                  <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Badge color={grade.score >= maxMarks * 0.75 ? 'green' : grade.score >= maxMarks * 0.5 ? 'blue' : 'red'}>
                      {grade.score}/{maxMarks}
                    </Badge>
                    <span style={{ fontSize: '.82rem', color: 'var(--gray-600)', flex: 1 }}>{grade.feedback}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- Overview dashboard ---
  const ungradedCount = enriched.filter(s => s.totalScore === null).length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto' }}>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <StatCard label="Students" value={uniqueStudents.length} sub={`${enriched.length} submission${enriched.length !== 1 ? 's' : ''} total`} />
        <StatCard label="Graded" value={graded.length} sub={`${ungradedCount} pending`} />
        <StatCard label="Avg MCQ" value={`${avgMcq.toFixed(1)}/14`} color="var(--blue)" />
        <StatCard label="Avg Total" value={avgTotal !== null ? `${avgTotal.toFixed(1)}/101` : '—'} sub={graded.length ? `from ${graded.length} graded` : 'grade to see'} color="var(--green)" />
        <StatCard label="Passing" value={graded.length ? `${passed}/${graded.length}` : '—'} sub={`≥${PASS_MARK} marks (75%)`} color={passed > 0 ? 'var(--green)' : 'var(--gray-400)'} />
      </div>

      {/* Grade all button */}
      {ungradedCount > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <button className="btn btn-primary" onClick={handleGradeAll} disabled={Object.values(grading).some(v => v === 'grading')}>
            {Object.values(grading).some(v => v === 'grading') ? '⏳ Grading...' : `✨ Grade all ${ungradedCount} ungraded submission${ungradedCount !== 1 ? 's' : ''}`}
          </button>
          <span style={{ marginLeft: '1rem', fontSize: '.85rem', color: 'var(--gray-400)' }}>Uses AI to mark Section B writing answers</span>
        </div>
      )}

      {/* Student table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)', textAlign: 'left' }}>
              <th style={th}>Student</th>
              <th style={th}>Submitted</th>
              <th style={{ ...th, textAlign: 'center' }}>Attempt</th>
              <th style={{ ...th, textAlign: 'center' }}>MCQ /14</th>
              <th style={{ ...th, textAlign: 'center' }}>Writing /87</th>
              <th style={{ ...th, textAlign: 'center' }}>Total /101</th>
              <th style={{ ...th, textAlign: 'center' }}>Status</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((sub, i) => (
              <tr
                key={sub._key}
                style={{ borderTop: i > 0 ? '1px solid var(--gray-100)' : 'none', cursor: 'pointer' }}
                onClick={() => setSelected(sub._key)}
              >
                <td style={td}><span style={{ fontWeight: 500 }}>{sub.studentName}</span></td>
                <td style={{ ...td, color: 'var(--gray-400)', fontSize: '.8rem' }}>{new Date(sub.submittedAt).toLocaleDateString()}<br />{new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td style={{ ...td, textAlign: 'center' }}><Badge color="blue">#{sub._attempt}</Badge></td>
                <td style={{ ...td, textAlign: 'center', fontWeight: 600 }}>{sub.mcqScore}</td>
                <td style={{ ...td, textAlign: 'center', fontWeight: 600 }}>{sub.writingTotal !== null ? sub.writingTotal : <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                <td style={{ ...td, textAlign: 'center', fontWeight: 700, fontSize: '1rem' }}>{sub.totalScore !== null ? sub.totalScore : <span style={{ color: 'var(--gray-300)' }}>—</span>}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  {sub.totalScore !== null
                    ? <Badge color={sub.totalScore >= PASS_MARK ? 'green' : 'red'}>{sub.totalScore >= PASS_MARK ? 'PASS' : 'FAIL'}</Badge>
                    : <Badge color="gray">Ungraded</Badge>}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '.78rem', padding: '.3rem .7rem' }}
                      onClick={(e) => { e.stopPropagation(); setSelected(sub._key); }}
                    >
                      View →
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ fontSize: '.78rem', padding: '.3rem .7rem' }}
                      onClick={(e) => { e.stopPropagation(); handleDelete(sub); }}
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { padding: '.75rem 1rem', fontWeight: 600, fontSize: '.82rem', color: 'var(--gray-600)', whiteSpace: 'nowrap' };
const td = { padding: '.85rem 1rem', verticalAlign: 'middle' };
