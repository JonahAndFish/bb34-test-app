import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';

export default function Teacher() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchResults = async (pwd) => {
    const res = await fetch('/api/results', { headers: { 'x-teacher-password': pwd } });
    if (res.status === 401) throw new Error('wrong-password');
    if (!res.ok) throw new Error('server-error');
    return res.json();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      setData(await fetchResults(password));
    } catch (err) {
      setError(err.message === 'wrong-password' ? 'Incorrect password.' : 'Could not load results. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    try { setData(await fetchResults(password)); } catch { /* ignore */ } finally { setLoading(false); }
  };

  // Auto-poll every 30 seconds while logged in
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (!data) return;
    const id = setInterval(() => refreshRef.current(), 30000);
    return () => clearInterval(id);
  }, [!!data]);

  if (!data) {
    return (
      <div className="teacher-login">
        <form className="card" onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Link to="/" style={{ fontSize: '.85rem', color: 'var(--blue)', textDecoration: 'none' }}>← Back to home</Link>
          </div>
          <div className="flex gap-1" style={{ marginBottom: '1.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>🎓</span>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 600 }}>Teacher Access</h2>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="pwd">Password</label>
            <input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter teacher password" autoFocus />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading || !password}>
            {loading ? 'Checking...' : 'View Results'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="header">
        <div>
          <div style={{ fontWeight: 600 }}>Teacher Dashboard</div>
          <div className="header-sub">{data.title}</div>
        </div>
        <div className="flex gap-1">
          <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ fontSize: '.85rem', padding: '.4rem .8rem' }}>← Home</button>
          <button className="btn btn-secondary" onClick={refresh} disabled={loading} style={{ fontSize: '.85rem', padding: '.4rem .8rem' }}>
            {loading ? '...' : '↻ Refresh'}
          </button>
          <button className="btn btn-secondary" onClick={() => setData(null)} style={{ fontSize: '.85rem', padding: '.4rem .8rem' }}>
            Logout
          </button>
        </div>
      </div>
      <Dashboard
        submissions={data.submissions}
        questions={data.questions}
        password={password}
        onRefresh={refresh}
      />
    </div>
  );
}
