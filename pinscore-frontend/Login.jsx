import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/auth.service';

export default function Login() {
  const { login: setToken } = useAuth();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.token) {
        setToken(data.token);
        navigate('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed — check credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Pinscore</h1>
        <p style={styles.sub}>Creator Dashboard</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="creator@example.com"
              autoComplete="email"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p style={styles.link}>
          No account?{' '}
          <a href="/register" style={{ color: '#4ECDC4' }}>Register</a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0F1A' },
  card:  { background: '#0D1117', border: '1px solid #1E2D40', borderRadius: '12px', padding: '40px', width: '360px' },
  title: { margin: '0 0 4px', fontSize: '28px', color: '#FFF', textAlign: 'center' },
  sub:   { margin: '0 0 32px', color: '#4ECDC4', fontSize: '13px', textAlign: 'center', fontFamily: 'monospace' },
  error: { background: '#2A0A0A', border: '1px solid #AA2222', borderRadius: '6px', padding: '10px 14px', marginBottom: '20px', color: '#FF8888', fontSize: '14px' },
  form:  { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { color: '#888', fontSize: '13px', fontWeight: '500' },
  input: { background: '#111820', border: '1px solid #2C4770', borderRadius: '6px', padding: '10px 12px', color: '#FFF', fontSize: '14px', outline: 'none' },
  btn:   { padding: '12px', background: '#2C4770', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' },
  link:  { marginTop: '20px', textAlign: 'center', color: '#666', fontSize: '14px' },
};
