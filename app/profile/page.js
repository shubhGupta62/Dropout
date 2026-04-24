'use client';

import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchUserProfile, updateProfile, uploadImage } from '../../lib/api';
import ClientShell from '../../components/ClientShell';
import {
  clearStoredUser,
  getStoredUserSnapshot,
  getStoredToken,
  notifyUserChanged,
  parseStoredUser,
  restoreStoredUserSession,
  subscribeToStoredUser,
} from '../../lib/userStorage';

function createEditForm(profile = {}) {
  return {
    name: profile.name || '',
    username: profile.username || '',
    bio: profile.bio || '',
    website: profile.website || '',
    instagramHandle: profile.instagramHandle || '',
    location: profile.location || '',
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const rawStoredUser = useSyncExternalStore(subscribeToStoredUser, getStoredUserSnapshot, () => null);
  const user = useMemo(() => parseStoredUser(rawStoredUser), [rawStoredUser]);
  const hasStoredToken = !!getStoredToken();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editForm, setEditForm] = useState(createEditForm());
  const [msg, setMsg] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState('');

  useEffect(() => {
    if (!user) {
      if (!hasStoredToken) {
        router.push('/login');
        return;
      }

      let cancelled = false;
      restoreStoredUserSession().then((restoredUser) => {
        if (cancelled) return;
        if (!restoredUser) router.push('/login');
      });

      return () => {
        cancelled = true;
      };
    }

    fetchUserProfile(user.id)
      .then((p) => {
        setProfile(p);
        setEditForm(createEditForm(p));
      })
      .catch((err) => {
        if (err.message?.includes('User not found')) {
          clearStoredUser();
          setProfile(null);
          setMsg('Your session is out of sync. Please log in again.');
          router.push('/login');
          return;
        }

        const fallbackProfile = {
          ...user,
          bio: user.bio || '',
          username: user.username || '',
          website: user.website || '',
          instagramHandle: user.instagramHandle || '',
          location: user.location || '',
          createdAt: user.createdAt || new Date().toISOString(),
          _count: { savedDrops: 0, comments: 0 },
        };
        setProfile(fallbackProfile);
        setEditForm(createEditForm(fallbackProfile));
      });
  }, [hasStoredToken, router, user]);

  const handleLogout = () => {
    clearStoredUser();
    router.push('/login');
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user || uploading) return;
    setUploading(true);
    setMsg('');
    const previousAvatar = profile?.avatar || '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewAvatar(ev.target.result);
    };
    reader.readAsDataURL(file);

    try {
      const result = await uploadImage(file, { folder: 'dropout_avatars' });
      const imageUrl = result.url;

      const updated = await updateProfile(user.id, { avatar: imageUrl });
      setProfile(updated);
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      Object.assign(localUser, {
        avatar: imageUrl,
        name: updated.name,
        username: updated.username,
        bio: updated.bio,
        website: updated.website,
        instagramHandle: updated.instagramHandle,
        location: updated.location,
      });
      localStorage.setItem('user', JSON.stringify(localUser));
      notifyUserChanged();
      setPreviewAvatar('');
      setMsg('Profile picture updated!');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setPreviewAvatar('');
      setProfile((current) => ({ ...current, avatar: previousAvatar }));
      setMsg(`Upload failed: ${err.message || 'Try a smaller image'}`);
      setTimeout(() => setMsg(''), 4000);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = await updateProfile(user.id, {
        name: editForm.name.trim(),
        username: editForm.username.trim().replace(/^@+/, ''),
        bio: editForm.bio.trim(),
        website: editForm.website.trim(),
        instagramHandle: editForm.instagramHandle.trim().replace(/^@+/, ''),
        location: editForm.location.trim(),
      });
      setProfile(updated);
      setEditForm(createEditForm(updated));
      setEditing(false);
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      Object.assign(localUser, {
        name: updated.name,
        username: updated.username,
        avatar: updated.avatar,
        bio: updated.bio,
        website: updated.website,
        instagramHandle: updated.instagramHandle,
        location: updated.location,
      });
      localStorage.setItem('user', JSON.stringify(localUser));
      notifyUserChanged();
      setMsg('Profile updated!');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setMsg(`Failed to save: ${err.message || 'Try again.'}`);
      setTimeout(() => setMsg(''), 3000);
    }
    setSaving(false);
  };

  const restoringSession = !user && hasStoredToken;

  if (restoringSession || !user || !profile) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div className="skeleton" style={{ width: '86px', height: '86px', borderRadius: '50%', margin: '0 auto 16px' }} />
      <div className="skeleton" style={{ width: '140px', height: '18px', margin: '0 auto 8px' }} />
      <div className="skeleton" style={{ width: '100px', height: '14px', margin: '0 auto' }} />
    </div>
  );

  const initial = (profile.name || '?').charAt(0).toUpperCase();
  const joinDateValue = profile.createdAt ? new Date(profile.createdAt) : null;
  const joinDate = joinDateValue && !Number.isNaN(joinDateValue.getTime())
    ? joinDateValue.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';
  const websiteHref = profile.website
    ? (profile.website.startsWith('http://') || profile.website.startsWith('https://')
      ? profile.website
      : `https://${profile.website}`)
    : '';
  const avatarSrc = previewAvatar || profile.avatar || '';

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff', outline: 'none',
    transition: 'all 0.25s ease', letterSpacing: '-0.01em',
  };

  return (
    <ClientShell
      fallback={
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div className="skeleton" style={{ width: '86px', height: '86px', borderRadius: '50%', margin: '0 auto 16px' }} />
          <div className="skeleton" style={{ width: '140px', height: '18px', margin: '0 auto' }} />
        </div>
      }
    >
    <div style={{ maxWidth: '470px', margin: '0 auto', width: '100%', padding: '24px 16px' }}>
      {/* ---- Header Section ---- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
        {/* Avatar with upload */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: '86px', height: '86px', borderRadius: '50%', cursor: 'pointer',
              background: avatarSrc ? 'var(--bg-secondary)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: avatarSrc ? '0' : '34px', fontWeight: 800, color: '#fff',
              border: '3px solid rgba(59,130,246,0.15)', transition: 'all 0.3s ease',
              position: 'relative', overflow: 'hidden',
              fontFamily: "'Sora', sans-serif",
            }}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={`${profile.name || 'User'} avatar`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : initial}
            {/* Hover overlay */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s ease',
            }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>
          {uploading && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', color: '#fff', fontWeight: 600,
            }}>...</div>
          )}
          {/* Camera badge */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              position: 'absolute', bottom: '-2px', right: '-2px',
              width: '26px', height: '26px', borderRadius: '50%',
              background: '#3b82f6', border: '2px solid var(--bg-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        </div>

        {/* Name & Role */}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '2px', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.03em' }}>{profile.name}</h1>
          {profile.username && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>@{profile.username}</div>
          )}
          <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 500, marginBottom: '4px', textTransform: 'capitalize' }}>
            {profile.role === 'brand' ? '🏢 Brand Account' : '👤 User'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{profile.email}</div>
        </div>
      </div>

      {/* ---- Bio Section ---- */}
      <div style={{ marginBottom: '20px' }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Display Name</label>
              <input
                style={inputStyle}
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Username</label>
              <input
                style={inputStyle}
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="yourhandle"
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bio</label>
              <textarea
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Tell people about yourself..."
                maxLength={150}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                {editForm.bio.length}/150
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Website</label>
                <input
                  style={inputStyle}
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  placeholder="yourbrand.com"
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Instagram</label>
                <input
                  style={inputStyle}
                  value={editForm.instagramHandle}
                  onChange={(e) => setEditForm({ ...editForm, instagramHandle: e.target.value })}
                  placeholder="@yourhandle"
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Location</label>
              <input
                style={inputStyle}
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="City, Country"
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                  background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: '13px',
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                  fontFamily: "'Sora', sans-serif",
                }}
              >{saving ? 'Saving...' : 'Save'}</button>
              <button
                onClick={() => { setEditing(false); setEditForm(createEditForm(profile)); }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-secondary)',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                }}
              >Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            {profile.bio ? (
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>{profile.bio}</p>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '10px' }}>No bio yet. Tap Edit to add one.</p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {profile.website && (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.02)',
                    color: '#fff',
                    fontSize: '12px',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              {profile.instagramHandle && (
                <span style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                  color: '#fff',
                  fontSize: '12px',
                }}>
                  @{profile.instagramHandle}
                </span>
              )}
              {profile.location && (
                <span style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                  color: '#fff',
                  fontSize: '12px',
                }}>
                  {profile.location}
                </span>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              style={{
                width: '100%', padding: '9px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.25s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.2)'; e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            >Edit Profile</button>
          </div>
        )}
      </div>

      {/* ---- Stats ---- */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '20px',
      }}>
        {[
          { label: 'Saved', value: profile._count?.savedDrops || 0 },
          { label: 'Comments', value: profile._count?.comments || 0 },
          { label: 'Joined', value: joinDate },
        ].map((stat) => (
          <div key={stat.label} style={{
            flex: 1, textAlign: 'center', padding: '16px 12px',
            background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ fontSize: typeof stat.value === 'number' ? '20px' : '12px', fontWeight: 700, color: '#fff', fontFamily: "'Sora', sans-serif" }}>{stat.value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ---- Message ---- */}
      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: '10px', marginBottom: '16px',
          background: msg.includes('fail') ? 'rgba(239,68,68,0.06)' : 'rgba(59,130,246,0.06)',
          border: `1px solid ${msg.includes('fail') ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)'}`,
          color: msg.includes('fail') ? '#ef4444' : '#60a5fa',
          fontSize: '13px', fontWeight: 500, textAlign: 'center',
        }}>{msg}</div>
      )}

      {/* ---- Quick Links ---- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Link href="/saved" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 16px', borderRadius: 'var(--radius-md)',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
          color: '#fff', fontSize: '14px', fontWeight: 500,
          textDecoration: 'none', transition: 'all 0.25s ease',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
        >
          <span style={{ fontSize: '16px' }}>🔖</span>
          <span style={{ flex: 1 }}>Saved Drops</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{profile._count?.savedDrops || 0}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>

        {profile.role === 'brand' && (
          <Link href="/dashboard" style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 16px', borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
            color: '#fff', fontSize: '14px', fontWeight: 500,
            textDecoration: 'none', transition: 'all 0.25s ease',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
          >
            <span style={{ fontSize: '16px' }}>📊</span>
            <span style={{ flex: 1 }}>Brand Dashboard</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        )}

        <Link href="/calendar" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 16px', borderRadius: 'var(--radius-md)',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
          color: '#fff', fontSize: '14px', fontWeight: 500,
          textDecoration: 'none', transition: 'all 0.25s ease',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
        >
          <span style={{ fontSize: '16px' }}>📅</span>
          <span style={{ flex: 1 }}>Drop Calendar</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)', margin: '4px 0' }} />

        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 16px', borderRadius: 'var(--radius-md)', width: '100%',
            background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)',
            color: '#ef4444', fontSize: '14px', fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.25s ease', textAlign: 'left',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.04)'}
        >
          <span style={{ fontSize: '16px' }}>🚪</span>
          <span>Log Out</span>
        </button>
      </div>
    </div>
    </ClientShell>
  );
}
