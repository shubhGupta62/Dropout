'use client';

import { useState, useEffect, useRef, useEffectEvent } from 'react';
import { useRouter } from 'next/navigation';
import { uploadImage, fetchBrands, fetchBrandAnalytics, formatNumber } from '../../lib/api';
import { getStoredToken, restoreStoredUserSession } from '../../lib/userStorage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dropout-htf0.onrender.com';

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export default function DashboardPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const hasStoredToken = !!getStoredToken();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'analytics'
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [launchNow, setLaunchNow] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [brandId, setBrandId] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'sneakers', price: '',
    dropDate: '', dropTime: '', website: '', imageUrl: '', brandName: '',
    accessType: 'open', maxQuantity: '',
  });

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!localUser && hasStoredToken) {
      let cancelled = false;
      restoreStoredUserSession().then((restoredUser) => {
        if (cancelled) return;
        if (!restoredUser) { router.push('/login'); return; }
        if (restoredUser.role !== 'brand') { router.push('/'); return; }
        setUser(restoredUser);
        setForm((f) => ({ ...f, brandName: restoredUser.name }));
      });
      return () => { cancelled = true; };
    }

    if (!localUser) { router.push('/login'); return; }
    if (localUser.role !== 'brand') { router.push('/'); return; }
    setUser(localUser);
    setForm(f => ({ ...f, brandName: localUser.name }));
  }, [hasStoredToken, router]);

  const loadAnalytics = useEffectEvent(async () => {
    setAnalyticsLoading(true);
    try {
      // First find or discover brandId
      const brands = await fetchBrands();
      const myBrand = brands.find(b => b.name === (form.brandName || user?.name));
      if (myBrand) {
        setBrandId(myBrand.id);
        const data = await fetchBrandAnalytics(myBrand.id);
        setAnalytics(data);
      } else {
        setAnalytics(null);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setAnalytics(null);
    }
    setAnalyticsLoading(false);
  });

  useEffect(() => {
    if (activeTab !== 'analytics' || !user) return;
    loadAnalytics();
  }, [activeTab, user]);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    setUploading(true);
    setError('');
    try {
      const result = await uploadImage(file);
      setForm(f => ({ ...f, imageUrl: result.url }));
    } catch (err) {
      setError(`Upload failed: ${err.message || 'Server error'}. Paste an image URL below instead.`);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.imageUrl) { setError('Please upload a product image'); return; }
    if (!form.title) { setError('Please enter a product title'); return; }
    if (!launchNow && (!form.dropDate || !form.dropTime)) { setError('Please set the drop date and time'); return; }

    setSubmitting(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const brandRes = await fetch(`${API_URL}/api/brands`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: form.brandName || user.name,
          logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(form.brandName || user.name)}&background=0a0a0f&color=3b82f6&size=64`,
          website: form.website || '',
        }),
        signal: controller.signal,
      });
      if (!brandRes.ok) {
        const err = await brandRes.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${brandRes.status}`);
      }
      const brand = await brandRes.json();

      const dropTime = launchNow
        ? new Date(Date.now() - 60000).toISOString()
        : new Date(`${form.dropDate}T${form.dropTime}:00`).toISOString();
      const dropRes = await fetch(`${API_URL}/api/drops`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          imageUrl: form.imageUrl,
          price: form.price ? `$${form.price.replace('$', '')}` : 'TBA',
          category: form.category,
          dropTime,
          website: form.website,
          brandId: brand.id,
          accessType: form.accessType,
          maxQuantity: form.maxQuantity || null,
        }),
        signal: controller.signal,
      });
      if (!dropRes.ok) {
        const err = await dropRes.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${dropRes.status}`);
      }

      setSuccess(launchNow ? '🎉 Drop is LIVE! Redirecting to feed...' : '🎉 Drop created! Redirecting to feed...');
      setForm({ title: '', description: '', category: 'sneakers', price: '', dropDate: '', dropTime: '', website: '', imageUrl: '', brandName: form.brandName, accessType: 'open', maxQuantity: '' });
      setLaunchNow(false);
      setImagePreview(null);
      setSubmitting(false);
      setTimeout(() => { setSuccess(''); router.push('/'); }, 1500);
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Request timed out — the server may be starting up. Please try again in a minute.');
      } else {
        setError(err.message || 'Failed to create drop');
      }
      setSubmitting(false);
    } finally {
      clearTimeout(timeout);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff', outline: 'none',
    transition: 'all 0.25s ease', boxSizing: 'border-box', letterSpacing: '-0.01em',
  };

  if ((!user && hasStoredToken) || !user) return null;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.03em' }}>
          <span style={{ color: '#3b82f6' }}>Brand</span> <span style={{ color: '#fff' }}>Dashboard</span>
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>
          Create drops and track performance
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-full)', padding: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
        {[
          { id: 'create', label: '✦ Create Drop' },
          { id: 'analytics', label: '📊 Analytics' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-full)', border: 'none',
              background: activeTab === tab.id ? 'rgba(59,130,246,0.12)' : 'transparent',
              color: activeTab === tab.id ? '#60a5fa' : 'var(--text-muted)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s ease',
              fontFamily: "'Sora', sans-serif",
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* ===== CREATE TAB ===== */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmit} style={{
          padding: '28px 24px', borderRadius: 'var(--radius-lg)',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', gap: '20px',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          {/* Image Upload */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Product Image *</label>
            <input type="file" ref={fileRef} accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
            <div onClick={() => fileRef.current?.click()} style={{
              width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-lg)',
              border: imagePreview ? 'none' : '2px dashed rgba(255,255,255,0.08)',
              background: imagePreview ? 'transparent' : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'all 0.25s ease',
            }}>
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {uploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontSize: '14px', fontWeight: 600 }}>Uploading...</div>
                  )}
                  {!uploading && form.imageUrl && (
                    <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(5,5,8,0.75)', backdropFilter: 'blur(12px)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '11px', color: '#34d399', fontWeight: 600 }}>✓ Uploaded</div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '28px', marginBottom: '10px', opacity: 0.5 }}>◇</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Click to upload image</div>
                  <div style={{ fontSize: '11px', marginTop: '4px' }}>JPG, PNG, WebP · Max 10MB</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: '8px' }}>
              <input style={{ ...inputStyle, fontSize: '12px' }} placeholder="Or paste image URL here (https://...)" value={form.imageUrl}
                onChange={(e) => { setForm({ ...form, imageUrl: e.target.value }); if (e.target.value) setImagePreview(e.target.value); }} />
            </div>
          </div>

          {/* Brand Name */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Brand Name</label>
            <input style={inputStyle} placeholder="Your brand name" value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
          </div>

          {/* Product Title */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Product Title *</label>
            <input style={inputStyle} placeholder="e.g. Air Max 2030 Limited Edition" value={form.title} required
              onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Caption / Description</label>
            <textarea style={{ ...inputStyle, resize: 'none', minHeight: '100px' }}
              placeholder="Describe your drop..." value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Category + Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</label>
              <select style={{ ...inputStyle, appearance: 'none' }} value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="sneakers">Sneakers</option>
                <option value="tech">Tech</option>
                <option value="streetwear">Streetwear</option>
                <option value="gaming">Gaming</option>
                <option value="ai-tools">AI Tools</option>
                <option value="creator-merch">Creator Merch</option>
                <option value="limited">Limited Edition</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Price</label>
              <input style={inputStyle} placeholder="$199.99" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
          </div>



          {/* Launch Type Toggle */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Launch Type</label>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-full)', padding: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <button type="button" onClick={() => setLaunchNow(true)} style={{
                flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-full)', border: 'none',
                background: launchNow ? 'rgba(52,211,153,0.12)' : 'transparent',
                color: launchNow ? '#34d399' : 'var(--text-muted)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s ease',
                fontFamily: "'Sora', sans-serif",
              }}>⚡ Launch Now</button>
              <button type="button" onClick={() => setLaunchNow(false)} style={{
                flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-full)', border: 'none',
                background: !launchNow ? 'rgba(59,130,246,0.12)' : 'transparent',
                color: !launchNow ? '#60a5fa' : 'var(--text-muted)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.25s ease',
                fontFamily: "'Sora', sans-serif",
              }}>🗓 Schedule</button>
            </div>
          </div>

          {launchNow ? (
            <div style={{
              padding: '12px 16px', borderRadius: '12px', fontSize: '12px',
              background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.1)', color: '#34d399',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              ⚡ This drop will go <strong>LIVE</strong> immediately after creation
            </div>
          ) : (
            <>
              {/* Drop Date + Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Drop Date *</label>
                  <input type="date" style={inputStyle} value={form.dropDate}
                    onChange={(e) => setForm({ ...form, dropDate: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Drop Time *</label>
                  <input type="time" style={inputStyle} value={form.dropTime}
                    onChange={(e) => setForm({ ...form, dropTime: e.target.value })} />
                </div>
              </div>
              {form.dropDate && form.dropTime && (
                <div style={{
                  padding: '12px 16px', borderRadius: '12px',
                  background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.08)',
                  fontSize: '12px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  🔔 Countdown will tick down to <strong>{form.dropDate} at {form.dropTime}</strong>
                </div>
              )}
            </>
          )}

          {/* Website */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Official Link (Shop Now)</label>
            <input type="url" style={inputStyle} placeholder="https://yourbrand.com/product"
              value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              This link will appear as the &quot;Shop Now&quot; button on your drop
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '13px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)', color: '#ef4444' }}>{error}</div>
          )}
          {success && (
            <div style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '13px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.1)', color: '#34d399' }}>✅ {success}</div>
          )}

          {/* Submit */}
          <button type="submit" disabled={submitting || uploading} style={{
            padding: '14px 28px', borderRadius: 'var(--radius-full)', border: 'none',
            background: (submitting || uploading) ? 'rgba(255,255,255,0.04)' : '#3b82f6',
            color: '#fff', fontSize: '14px', fontWeight: 600,
            cursor: (submitting || uploading) ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s ease', width: '100%',
            fontFamily: "'Sora', sans-serif", letterSpacing: '-0.01em',
          }}>
            {submitting ? 'Creating Drop...' : uploading ? 'Uploading Image...' : launchNow ? '⚡ Go Live' : 'Launch Drop'}
          </button>
        </form>
      )}

      {/* ===== ANALYTICS TAB ===== */}
      {activeTab === 'analytics' && (
        <div>
          {analyticsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-md)' }} />
              ))}
            </div>
          ) : !analytics ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}>📊</div>
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: '6px', fontFamily: "'Sora', sans-serif", fontSize: '15px' }}>No analytics yet</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Create your first drop to see analytics</div>
            </div>
          ) : (
            <>
              {/* Summary stats */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px',
              }}>
                {[
                  { label: 'Followers', value: analytics.followers, color: '#3b82f6' },
                  { label: 'Total Views', value: analytics.totalViews, color: '#8b5cf6' },
                  { label: 'Total Likes', value: analytics.totalLikes, color: '#ef4444' },
                  { label: 'Total Saves', value: analytics.totalSaves, color: '#f59e0b' },
                  { label: 'Comments', value: analytics.totalComments, color: '#34d399' },
                  { label: 'Entries', value: analytics.totalEntries, color: '#ec4899' },
                ].map((stat) => (
                  <div key={stat.label} style={{
                    padding: '16px 12px', borderRadius: 'var(--radius-md)', textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: stat.color, fontFamily: "'Sora', sans-serif" }}>
                      {formatNumber(stat.value)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px', fontWeight: 500 }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Per-drop breakdown */}
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '12px', fontFamily: "'Sora', sans-serif" }}>
                Drops ({analytics.totalDrops})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {analytics.drops.map((d) => (
                  <div key={d.id} style={{
                    display: 'flex', gap: '12px', padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                    alignItems: 'center',
                  }}>
                    <img src={d.imageUrl} alt={d.title} style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>{d.title}</div>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span>👁 {formatNumber(d.views)}</span>
                        <span>❤️ {formatNumber(d.likes)}</span>
                        <span>💬 {formatNumber(d.comments)}</span>
                        <span>🔖 {formatNumber(d.saves)}</span>
                        {d.entries > 0 && <span>🎟 {formatNumber(d.entries)}</span>}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 10px', borderRadius: 'var(--radius-full)',
                      background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.08)',
                      fontSize: '11px', fontWeight: 600, color: '#60a5fa', flexShrink: 0,
                    }}>
                      🔥 {d.hypeScore}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
