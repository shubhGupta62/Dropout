'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchDrop } from '../../../lib/api';
import DropDetailClient from './DropDetailClient';
import Link from 'next/link';

export default function DropDetailFallbackClient({ id }) {
  const router = useRouter();
  const [drop, setDrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchDrop(id)
      .then((data) => {
        setDrop(data);
        setLoading(false);
      })
      .catch(() => {
        // Try local mock data
        import('../../../lib/drops').then(({ getDropById }) => {
          const d = getDropById(id);
          if (d) {
            setDrop(d);
          } else {
            setNotFound(true);
          }
          setLoading(false);
        });
      });
  }, [id]);

  if (loading) {
    return (
      <div style={{ maxWidth: '470px', margin: '0 auto', padding: '24px 16px' }}>
        <div className="skeleton" style={{ width: '60px', height: '14px', marginBottom: '16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
          <div className="skeleton" style={{ width: '120px', height: '14px' }} />
        </div>
        <div className="skeleton" style={{ width: '100%', aspectRatio: '1', borderRadius: '2px' }} />
      </div>
    );
  }

  if (notFound || !drop) {
    return (
      <div style={{ maxWidth: '470px', margin: '0 auto', textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px', opacity: 0.5 }}>◇</div>
        <div style={{ fontWeight: 600, color: '#fff', marginBottom: '8px', fontFamily: "'Sora', sans-serif", fontSize: '16px', letterSpacing: '-0.02em' }}>Drop not found</div>
        <Link href="/" style={{
          display: 'inline-block', marginTop: '16px', padding: '10px 28px',
          borderRadius: 'var(--radius-full)', background: '#3b82f6', color: '#fff',
          fontWeight: 600, fontSize: '13px', textDecoration: 'none',
          fontFamily: "'Sora', sans-serif",
        }}>Back to Feed</Link>
      </div>
    );
  }

  return <DropDetailClient drop={drop} />;
}
