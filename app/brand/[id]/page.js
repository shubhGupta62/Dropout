'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DropCard from '../../../components/DropCard';
import { transformDrop, toggleFollowBrand } from '../../../lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dropout-htf0.onrender.com';

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export default function BrandProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [brand, setBrand] = useState(null);
  const [drops, setDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/brands/${id}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setBrand(data);
        setFollowing(data.isFollowing || false);
        setFollowerCount(data._count?.followers || 0);
        setDrops((data.drops || []).map(d => ({
          ...transformDrop(d),
          brand: { id: data.id, name: data.name, logo: data.logo },
        })));
      } catch {
        setBrand(null);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleFollow = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) { router.push('/login'); return; }
    if (followLoading) return;
    setFollowLoading(true);
    const prev = following;
    setFollowing(!prev);
    setFollowerCount(c => prev ? c - 1 : c + 1);
    try {
      const res = await fetch(`${API_URL}/api/brands/${id}/follow`, {
        method: 'PUT',
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setFollowing(result.following);
      setFollowerCount(result.followers);
    } catch {
      setFollowing(prev);
      setFollowerCount(c => prev ? c + 1 : c - 1);
    }
    setFollowLoading(false);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '470px', margin: '0 auto', padding: '40px 16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="skeleton" style={{ width: '90px', height: '90px', borderRadius: '50%', margin: '0 auto 16px' }} />
          <div className="skeleton" style={{ width: '120px', height: '18px', margin: '0 auto 10px' }} />
          <div className="skeleton" style={{ width: '80px', height: '14px', margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div style={{ maxWidth: '470px', margin: '0 auto', padding: '60px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px', opacity: 0.5 }}>◇</div>
        <div style={{ fontWeight: 600, color: '#fff', fontFamily: "'Sora', sans-serif" }}>Brand not found</div>
        <Link href="/" style={{ color: '#3b82f6', fontSize: '13px', textDecoration: 'none' }}>← Back to feed</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '470px', margin: '0 auto', width: '100%' }}>
      {/* Back */}
      <div style={{ padding: '14px 16px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', cursor: 'pointer', fontWeight: 500, padding: 0 }}>← Back</button>
      </div>

      {/* ═══ PROFILE CARD ═══ */}
      <div style={{
        margin: '0 16px 20px',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(59,130,246,0.06), rgba(255,255,255,0.02))',
        border: '1px solid rgba(59,130,246,0.08)',
        padding: '28px 24px 24px',
        backdropFilter: 'blur(16px)',
      }}>
        {/* Avatar + Name */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '88px', height: '88px', borderRadius: '50%', margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            padding: '3px', position: 'relative',
          }}>
            <img
              src={brand.logo}
              alt={brand.name}
              style={{
                width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover',
                background: '#0a0a0f', border: '3px solid #0a0a0f',
              }}
              onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${brand.name}&background=0a0a0f&color=3b82f6&size=88`; }}
            />
            {/* Verified badge */}
            <div style={{
              position: 'absolute', bottom: '2px', right: '2px',
              width: '22px', height: '22px', borderRadius: '50%',
              background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '3px solid #0a0a0f',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff" stroke="none">
                <path d="M20 6L9 17l-5-5 1.41-1.41L9 14.17l9.59-9.59z"/>
              </svg>
            </div>
          </div>
          <h1 style={{
            fontSize: '22px', fontWeight: 700, color: '#fff',
            fontFamily: "'Sora', sans-serif", letterSpacing: '-0.03em', marginBottom: '4px',
          }}>{brand.name}</h1>
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>Brand</span>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '20px',
        }}>
          <div style={{
            flex: 1, textAlign: 'center', padding: '14px 8px',
            borderRadius: '16px', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{
              fontSize: '20px', fontWeight: 700, color: '#fff',
              fontFamily: "'Sora', sans-serif", lineHeight: 1,
            }}>{drops.length}</div>
            <div style={{
              fontSize: '10px', color: 'var(--text-muted)', marginTop: '5px',
              textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500,
            }}>Drops</div>
          </div>
          <div style={{
            flex: 1, textAlign: 'center', padding: '14px 8px',
            borderRadius: '16px', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{
              fontSize: '20px', fontWeight: 700, color: '#fff',
              fontFamily: "'Sora', sans-serif", lineHeight: 1,
            }}>{followerCount}</div>
            <div style={{
              fontSize: '10px', color: 'var(--text-muted)', marginTop: '5px',
              textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500,
            }}>Followers</div>
          </div>
          <div style={{
            flex: 1, textAlign: 'center', padding: '14px 8px',
            borderRadius: '16px', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{
              fontSize: '20px', fontWeight: 700, color: '#fff',
              fontFamily: "'Sora', sans-serif", lineHeight: 1,
            }}>🔥</div>
            <div style={{
              fontSize: '10px', color: 'var(--text-muted)', marginTop: '5px',
              textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500,
            }}>Active</div>
          </div>
        </div>

        {/* Follow Button */}
        <button
          onClick={handleFollow}
          disabled={followLoading}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 'var(--radius-full)',
            fontSize: '14px', fontWeight: 600, cursor: followLoading ? 'wait' : 'pointer',
            transition: 'all 0.3s ease', fontFamily: "'Sora', sans-serif",
            letterSpacing: '-0.01em',
            border: following ? '1px solid rgba(255,255,255,0.08)' : 'none',
            background: following
              ? 'rgba(255,255,255,0.04)'
              : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: following ? 'var(--text-secondary)' : '#fff',
            boxShadow: following ? 'none' : '0 4px 20px rgba(59,130,246,0.25)',
          }}
        >
          {followLoading ? '...' : following ? 'Following ✓' : 'Follow'}
        </button>
      </div>

      {/* ═══ DROPS SECTION ═══ */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        margin: '0 16px', paddingTop: '16px',
      }}>
        <div style={{
          fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)',
          fontFamily: "'Sora', sans-serif", letterSpacing: '-0.01em',
          marginBottom: '12px', paddingLeft: '2px',
        }}>
          {drops.length} {drops.length === 1 ? 'Drop' : 'Drops'}
        </div>
      </div>
      {drops.map((drop, i) => (
        <DropCard key={drop.id} drop={drop} index={i} />
      ))}
      {drops.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
          No drops yet
        </div>
      )}
    </div>
  );
}
