import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/auth.service';

export default function Register() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ username: '', email: '', password: '' });
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function onChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await register(form.username, form.email, form.password);
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Check your email</h1>
          <p style={{ color: '#888', textAlign: 'center' }}>
            We sent an OTP to <strong style={{ color: '#4ECDC4' }}>{form.email}</strong>.
            Enter it to verify your account.
          </p>
          <a href="/verify" style={styles.btn}>Enter OTP →</a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Pinscore</h1>
        <p style={styles.sub}>Create your account</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {[
            { name: 'username', label: 'Username',   type: 'text',     placeholder: 'yourhandle' },
            { name: 'email',    label: 'Email',      type: 'email',    placeholder: 'you@example.com' },
            { name: 'password', label: 'Password',   type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.name} style={styles.field}>
              <label style={styles.label}>{f.label}</label>
              <input
                type={f.type}
                name={f.name}
                value={form[f.name]}
                onChange={onChange}
                required
                style={styles.input}
                placeholder={f.placeholder}
              />
            </div>
          ))}
          <button type="submit" style={styles.btnSubmit} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={styles.link}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#4ECDC4' }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page:      { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0F1A' },
  card:      { background: '#0D1117', border: '1px solid #1E2D40', borderRadius: '12px', padding: '40px', width: '360px' },
  title:     { margin: '0 0 4px', fontSize: '28px', color: '#FFF', textAlign: 'center' },
  sub:       { margin: '0 0 32px', color: '#4ECDC4', fontSize: '13px', textAlign: 'center', fontFamily: 'monospace' },
  error:     { background: '#2A0A0A', border: '1px solid #AA2222', borderRadius: '6px', padding: '10px 14px', marginBottom: '20px', color: '#FF8888', fontSize: '14px' },
  form:      { display: 'flex', flexDirection: 'column', gap: '16px' },
  field:     { display: 'flex', flexDirection: 'column', gap: '6px' },
  label:     { color: '#888', fontSize: '13px', fontWeight: '500' },
  input:     { background: '#111820', border: '1px solid #2C4770', borderRadius: '6px', padding: '10px 12px', color: '#FFF', fontSize: '14px', outline: 'none' },
  btnSubmit: { padding: '12px', background: '#2C4770', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' },
  btn:       { display: 'block', textAlign: 'center', marginTop: '20px', padding: '12px', background: '#2C4770', color: '#FFF', borderRadius: '6px', textDecoration: 'none' },
  link:      { marginTop: '20px', textAlign: 'center', color: '#666', fontSize: '14px' },
};
