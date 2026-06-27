import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatBot from '../components/ChatBot';
import TestForm from '../components/TestForm';
import BBLearn from '../components/BBLearn';

export default function Student() {
  const navigate = useNavigate();
  const [step, setStep] = useState('name');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [nameChecking, setNameChecking] = useState(false);
  const [tab, setTab] = useState('learn');
  const [confirmedName, setConfirmedName] = useState('');
  const [confirmedPin, setConfirmedPin] = useState('');
  const [questions, setQuestions] = useState(null);
  const [sections, setSections] = useState(null);
  const [qError, setQError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [checkingResult, setCheckingResult] = useState(false);
  const [totalAttempts, setTotalAttempts] = useState(0);

  useEffect(() => {
    fetch('/api/questions')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => { setQuestions(d); setSections(d.sections ?? null); })
      .catch(() => setQError(true));
  }, []);

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setNameChecking(true);
    try {
      const res = await fetch(`/api/student-result?name=${encodeURIComponent(name.trim())}`);
      const data = await res.json();
      setStep(data.found ? 'pin-return' : 'pin-new');
    } catch {
      setStep('pin-new');
    } finally {
      setNameChecking(false);
    }
  };

  const handleNewPin = (e) => {
    e.preventDefault();
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    setConfirmedName(name.trim());
    setConfirmedPin(pin);
  };

  const handleReturnPin = async (e) => {
    e.preventDefault();
    setPinError('');
    setNameChecking(true);
    try {
      const res = await fetch(`/api/student-result?name=${encodeURIComponent(name.trim())}&pin=${encodeURIComponent(pin)}`);
      const data = await res.json();
      if (data.wrongPin) { setPinError('Incorrect PIN. This account belongs to someone else.'); return; }
      setConfirmedName(name.trim());
      setConfirmedPin(pin);
      setTotalAttempts(data.totalAttempts ?? 1);
      if (data.graded) setResult(data);
      else setResult({ graded: false });
      setStep('return-choice');
    } catch {
      setPinError('Could not verify PIN. Please try again.');
    } finally {
      setNameChecking(false);
    }
  };

  const checkResult = async () => {
    setCheckingResult(true);
    try {
      const res = await fetch(`/api/student-result?name=${encodeURIComponent(confirmedName)}&pin=${encodeURIComponent(confirmedPin)}`);
      const data = await res.json();
      if (data.graded) { setResult(data); setStep('show-results'); }
      else setResult({ graded: false });
    } catch {
      setResult({ graded: false });
    } finally {
      setCheckingResult(false);
    }
  };

  const startRetake = () => {
    setSubmitted(false);
    setResult(null);
    setTab('learn');
    setStep('retaking');
  };

  const headerBar = () => (
    <div className="header">
      <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ padding: '.4rem .8rem', fontSize: '.85rem' }}>← Back</button>
      <span className="header-sub">{questions?.title ?? 'BB 34th Singapore Company'}</span>
    </div>
  );

  if (step === 'name') return (
    <div className="page">
      {headerBar()}
      <form className="name-entry" onSubmit={handleNameSubmit}>
        <h2>Welcome, student!</h2>
        <p>Enter your full name to start learning, take the test, or check your results.</p>
        <div className="w-full">
          <label htmlFor="name">Your full name</label>
          <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Smith" autoFocus />
        </div>
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={!name.trim() || nameChecking}>
          {nameChecking ? 'Checking...' : 'Continue'}
        </button>
      </form>
    </div>
  );

  if (step === 'pin-new' && !confirmedName) return (
    <div className="page">
      {headerBar()}
      <form className="name-entry" onSubmit={handleNewPin}>
        <h2>Hi, {name}!</h2>
        <p>Create a 4-digit PIN to protect your account. You'll need it to return and check your results later.</p>
        <div className="w-full">
          <label htmlFor="pin">Create PIN (4 digits)</label>
          <input id="pin" type="password" inputMode="numeric" maxLength={4} value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
            placeholder="e.g. 1234" autoFocus
            style={{ letterSpacing: '.3em', fontSize: '1.5rem', textAlign: 'center' }} />
          {pinError && <p className="error mt-1">{pinError}</p>}
        </div>
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pin.length !== 4}>Let's Begin →</button>
        <button type="button" className="btn btn-secondary w-full" onClick={() => { setStep('name'); setPin(''); setPinError(''); }}>← Change name</button>
      </form>
    </div>
  );

  if (step === 'pin-return') return (
    <div className="page">
      {headerBar()}
      <form className="name-entry" onSubmit={handleReturnPin}>
        <h2>Welcome back, {name}!</h2>
        <p>Enter your PIN to continue.</p>
        <div className="w-full">
          <label htmlFor="pin">Your PIN</label>
          <input id="pin" type="password" inputMode="numeric" maxLength={4} value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
            placeholder="4-digit PIN" autoFocus
            style={{ letterSpacing: '.3em', fontSize: '1.5rem', textAlign: 'center' }} />
          {pinError && <p className="error mt-1">{pinError}</p>}
        </div>
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pin.length !== 4 || nameChecking}>
          {nameChecking ? 'Verifying...' : 'Continue'}
        </button>
        <button type="button" className="btn btn-secondary w-full" onClick={() => { setStep('name'); setPin(''); setPinError(''); }}>← Change name</button>
      </form>
    </div>
  );

  if (result?.graded && step === 'show-results') {
    const writingMaxMarks = result.writingFeedback?.reduce((s, w) => s + (w.marks ?? 0), 0) ?? 0;
    return (
      <div className="page">
        <div className="header">
          <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ padding: '.4rem .8rem', fontSize: '.85rem' }}>← Home</button>
          <span className="header-sub">{questions?.title}</span>
        </div>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '.9rem', color: 'var(--gray-400)', marginBottom: '.25rem' }}>
              {result.studentName} — Attempt {result.attemptNumber} of {result.totalAttempts}
            </div>
            <div style={{ fontSize: '3.5rem', fontWeight: 800, color: result.passed ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>
              {result.totalScore}<span style={{ fontSize: '1.5rem', fontWeight: 400 }}>/101</span>
            </div>
            <div style={{ marginTop: '.5rem', display: 'inline-block', background: result.passed ? 'var(--green-light)' : 'var(--red-light)', color: result.passed ? 'var(--green)' : 'var(--red)', padding: '.25rem 1rem', borderRadius: 20, fontWeight: 700, fontSize: '1rem' }}>
              {result.passed ? 'PASS ✓' : 'FAIL ✗'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.25rem' }}>
              <div><div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{result.mcqScore}/14</div><div style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>MCQ</div></div>
              <div><div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{result.writingTotal}/{writingMaxMarks}</div><div style={{ fontSize: '.8rem', color: 'var(--gray-400)' }}>Writing</div></div>
            </div>
          </div>

          {/* MCQ results */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Section A — MCQ ({result.mcqScore}/14)</div>
            {result.mcqResults?.map((item) => (
              <div key={item.number} style={{ marginBottom: '.85rem', paddingBottom: '.85rem', borderBottom: item.number < result.mcqResults.length ? '1px solid var(--gray-100)' : 'none' }}>
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', marginBottom: '.35rem' }}>
                  <span style={{ fontWeight: 600, minWidth: 28, fontSize: '.875rem' }}>Q{item.number}.</span>
                  <span style={{ fontSize: '.875rem', flex: 1 }}>{item.question}</span>
                  <span style={{ fontWeight: 700, color: item.correct ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>{item.correct ? '✓ 2m' : '✗ 0m'}</span>
                </div>
                <div style={{ paddingLeft: '1.75rem' }}>
                  {item.options.map((opt, oi) => {
                    const letter = ['A','B','C','D'][oi];
                    const isStudent = item.studentAnswer?.toUpperCase() === letter;
                    const isCorrect = item.correctAnswer?.toUpperCase() === letter;
                    let bg = 'transparent', color = 'var(--gray-600)', fw = 400;
                    if (isCorrect) { bg = 'var(--green-light)'; color = 'var(--green)'; fw = 600; }
                    else if (isStudent) { bg = 'var(--red-light)'; color = 'var(--red)'; fw = 600; }
                    return (
                      <div key={letter} style={{ display: 'flex', gap: '.4rem', padding: '.2rem .4rem', borderRadius: 4, background: bg, color, fontWeight: fw, fontSize: '.82rem', marginBottom: '.15rem' }}>
                        <span>{letter}.</span><span style={{ flex: 1 }}>{opt}</span>
                        {isCorrect && <span>✓ correct</span>}
                        {isStudent && !isCorrect && <span>your answer</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Writing feedback */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Section B — Writing ({result.writingTotal}/{writingMaxMarks})</div>
            {result.writingFeedback?.map((item, i) => (
              <div key={i} style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: i < result.writingFeedback.length - 1 ? '1px solid var(--gray-100)' : 'none' }}>
                <div style={{ fontSize: '.85rem', color: 'var(--gray-600)', marginBottom: '.4rem', fontWeight: 500 }}>Q{i + 8}. {item.question}</div>
                <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '.75rem', fontSize: '.875rem', whiteSpace: 'pre-wrap', marginBottom: '.6rem' }}>
                  {item.answer || <em style={{ color: 'var(--gray-400)' }}>No answer provided</em>}
                </div>
                <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start' }}>
                  <span style={{ background: item.score >= item.marks * 0.75 ? 'var(--green-light)' : item.score >= item.marks * 0.5 ? 'var(--blue-light)' : 'var(--red-light)', color: item.score >= item.marks * 0.75 ? 'var(--green)' : item.score >= item.marks * 0.5 ? 'var(--blue)' : 'var(--red)', padding: '.2rem .75rem', borderRadius: 20, fontWeight: 700, fontSize: '.85rem', whiteSpace: 'nowrap' }}>
                    {item.score}/{item.marks}
                  </span>
                  <span style={{ fontSize: '.875rem', color: 'var(--gray-600)' }}>{item.feedback}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary w-full" onClick={() => setStep('return-choice')}>← Back</button>
        </div>
      </div>
    );
  }

  if (submitted) return (
    <div className="page">
      <div className="header">
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ padding: '.4rem .8rem', fontSize: '.85rem' }}>← Home</button>
        <span className="header-sub">{questions?.title}</span>
      </div>
      <div className="submitted-state">
        <div className="check">✅</div>
        <h2>Answers submitted!</h2>
        <p>Your teacher will mark your writing. Come back here with your PIN to check your score.</p>
        {result?.graded === false && <p style={{ color: 'var(--gray-400)', fontSize: '.875rem' }}>Not graded yet — check back soon.</p>}
        <button className="btn btn-primary mt-2" onClick={checkResult} disabled={checkingResult}>
          {checkingResult ? 'Checking...' : '📊 Check my results'}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Back to home</button>
      </div>
    </div>
  );

  if (step === 'return-choice') return (
    <div className="page">
      {headerBar()}
      <div className="name-entry">
        <h2>Hi, {confirmedName}!</h2>
        <p style={{ color: 'var(--gray-600)' }}>
          You have completed <strong>{totalAttempts}</strong> attempt{totalAttempts !== 1 ? 's' : ''}. What would you like to do?
        </p>
        <button className="btn btn-primary btn-lg w-full" onClick={() => {
          if (result?.graded) setStep('show-results');
          else setSubmitted(true);
        }}>📊 View my results</button>
        <button className="btn btn-secondary btn-lg w-full" onClick={startRetake}>🔄 Retake the test</button>
      </div>
    </div>
  );

  const testContent = () => {
    if (qError) return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--red)' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Could not load questions.</p>
        <p style={{ marginTop: '.5rem', color: 'var(--gray-600)', fontSize: '.9rem' }}>Make sure the app is running via <code>netlify dev</code>.</p>
      </div>
    );
    if (!questions) return <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--gray-400)' }}>Loading questions...</div>;
    return <TestForm questions={questions} studentName={confirmedName} pin={confirmedPin} onSubmitted={() => setSubmitted(true)} />;
  };

  return (
    <div className="page">
      <div className="header">
        <div>
          <div style={{ fontWeight: 600 }}>{confirmedName}</div>
          <div className="header-sub">{questions?.title}</div>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ padding: '.4rem .8rem', fontSize: '.85rem' }}>← Exit</button>
      </div>
      <div className="tabs" style={{ padding: '0 1.5rem', background: '#fff', borderBottom: '1px solid var(--gray-200)', marginBottom: 0 }}>
        <div className={`tab ${tab === 'learn' ? 'active' : ''}`} onClick={() => setTab('learn')}>📖 Learn</div>
        <div className={`tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>💬 AI Tutor</div>
        <div className={`tab ${tab === 'test' ? 'active' : ''}`} onClick={() => setTab('test')}>📝 Test</div>
      </div>
      {tab === 'learn' && <BBLearn sections={sections} />}
      {tab === 'chat' && <ChatBot studentName={confirmedName} />}
      {tab === 'test' && testContent()}
    </div>
  );
}
