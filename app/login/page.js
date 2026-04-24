'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login, signup } from '../../lib/api';
import { notifyUserChanged } from '../../lib/userStorage';
import dynamic from 'next/dynamic';
import { GlassFilter, LiquidGlassButton } from '../../components/LiquidGlass';

const StarField = dynamic(() => import('../../components/FluidCanvas'), { ssr: false });

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = tab === 'login'
        ? await login(email, password)
        : await signup(email, name, password, role);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      notifyUserChanged();
      router.push('/feed');
    } catch (err) {
      console.error('[Login] Error:', err);
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Pure dark + star field */}
      <StarField />
      <GlassFilter />

      {/* 3D Glass Plate — tilts up from ground */}
      <div className="login-perspective-wrap">
        <div className="login-glass-3d">
          {/* Logo */}
          <div className="login-logo">
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span className="login-logo-text">
                <span style={{ color: '#fff' }}>Drop</span>
                <span style={{ background: 'linear-gradient(90deg, #b8ccff, #c4a6ff)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>amyn</span>
              </span>
            </Link>
            <p className="login-subtitle">
              {tab === 'login' ? 'Welcome back.' : 'Join the community.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="login-tabs">
            {['login', 'signup'].map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(''); }}
                className={`login-tab ${tab === t ? 'active' : ''}`}>
                {t === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Role selector */}
          {tab === 'signup' && (
            <div className="login-roles">
              <div className="login-roles-label">I am a...</div>
              <div className="login-roles-grid">
                {[
                  { id: 'user', emoji: '👤', label: 'User', desc: 'Browse, like, save' },
                  { id: 'brand', emoji: '🏢', label: 'Brand', desc: 'Create & manage drops' },
                ].map((r) => (
                  <button key={r.id} type="button" onClick={() => setRole(r.id)}
                    className={`login-role-btn ${role === r.id ? 'active' : ''}`}>
                    <span className="login-role-emoji">{r.emoji}</span>
                    <span className="login-role-name">{r.label}</span>
                    <span className="login-role-desc">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {tab === 'signup' && (
              <div className="login-input-wrap">
                <input type="text" placeholder="Full Name" value={name}
                  onChange={(e) => setName(e.target.value)} required className="login-input" />
              </div>
            )}
            <div className="login-input-wrap">
              <input type="email" placeholder="Email address" value={email}
                onChange={(e) => setEmail(e.target.value)} required className="login-input" />
            </div>
            <div className="login-input-wrap">
              <input type="password" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6} className="login-input" />
            </div>

            {error && <div className="login-error">{error}</div>}

            <LiquidGlassButton type="submit" disabled={loading} className="login-liquid-submit">
              {loading ? <span className="login-spinner" /> : tab === 'login' ? 'Log In' : `Create ${role === 'brand' ? 'Brand ' : ''}Account`}
            </LiquidGlassButton>
          </form>

          <div className="login-footer">
            <Link href="/feed" className="login-footer-link">Browse as guest →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
