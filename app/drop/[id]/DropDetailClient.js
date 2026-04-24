'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toggleLike, toggleSave, toggleFollowBrand, addComment, formatNumber } from '../../../lib/api';
import CountdownTimer from '../../../components/CountdownTimer';
import Link from 'next/link';

function getTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function DropDetailClient({ drop: initialDrop }) {
  const router = useRouter();
  const [drop] = useState(initialDrop);
  const [liked, setLiked] = useState(initialDrop.isLiked || false);
  const [likeCount, setLikeCount] = useState(initialDrop._count?.likes || 0);
  const [saved, setSaved] = useState(initialDrop.isSaved || false);
  const [following, setFollowing] = useState(initialDrop.isFollowingBrand || false);
  const [notified, setNotified] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(() => (
    initialDrop.comments?.map(c => ({
      id: c.id,
      user: c.user?.name || 'Anonymous',
      text: c.text,
      time: getTimeAgo(c.createdAt),
    })) || []
  ));
  const [posting, setPosting] = useState(false);

  const getUser = () => typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;

  const requireLogin = () => {
    if (!getUser()) {
      alert('Log in to interact');
      router.push('/login');
      return false;
    }
    return true;
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!requireLogin()) return;
    const user = getUser();
    setPosting(true);
    try {
      const comment = await addComment(drop.id, newComment.trim());
      setComments([{
        id: comment.id,
        user: comment.user?.name || user.name,
        text: comment.text,
        time: 'now',
      }, ...comments]);
      setNewComment('');
    } catch (err) {
      alert('Failed to post comment');
    }
    setPosting(false);
  };

  const handleLike = async () => {
    if (!requireLogin()) return;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    try {
      const result = await toggleLike(drop.id);
      setLiked(result.liked);
      setLikeCount(result.likes);
    } catch {
      setLiked(!newLiked);
      setLikeCount(prev => newLiked ? prev - 1 : prev + 1);
    }
  };

  const handleSave = async () => {
    const user = getUser();
    if (!user) { alert('Log in to interact'); router.push('/login'); return; }
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      await toggleSave(user.id, drop.id);
    } catch {
      setSaved(!newSaved);
    }
  };

  const handleFollow = async () => {
    if (!requireLogin()) return;
    const brandId = drop.brand?.id || drop.brandId;
    if (!brandId) return;
    const newFollowing = !following;
    setFollowing(newFollowing);
    try {
      const result = await toggleFollowBrand(brandId);
      setFollowing(result.following);
    } catch {
      setFollowing(!newFollowing);
    }
  };

  const saves = drop._count?.saves || 0;

  return (
    <div style={{ maxWidth: '470px', margin: '0 auto', width: '100%' }}>
      {/* Back */}
      <div style={{ padding: '14px 16px' }}>
        <Link href="/" style={{ color: '#3b82f6', fontSize: '13px', textDecoration: 'none', fontWeight: 500, letterSpacing: '-0.01em' }}>← Feed</Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px 14px', gap: '12px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', padding: '2px',
        }}>
          <img
            src={drop.brand?.logo}
            alt={drop.brand?.name}
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: 'var(--bg-secondary)', border: '2px solid var(--bg-primary)' }}
            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${drop.brand?.name}&background=0a0a0f&color=3b82f6&size=36`; }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>{drop.brand?.name}</div>
          <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 500, textTransform: 'capitalize' }}>{drop.category?.replace('-', ' ')}</div>
        </div>
        <button onClick={handleFollow} style={{
          padding: '5px 14px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 600,
          border: following ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(59,130,246,0.3)',
          background: following ? 'transparent' : 'rgba(59,130,246,0.1)',
          color: following ? 'var(--text-secondary)' : '#60a5fa',
          cursor: 'pointer', transition: 'all 0.25s ease',
        }}>{following ? 'Following' : 'Follow'}</button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '12px', fontWeight: 600,
          background: 'rgba(59,130,246,0.06)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.08)',
        }}>
          🔥 {drop.hypeScore}
        </div>
      </div>

      {/* Image */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
        <img src={drop.imageUrl} alt={drop.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{
          position: 'absolute', bottom: '14px', right: '14px', fontSize: '13px', fontWeight: 600, color: '#fff',
          background: 'rgba(5,5,8,0.7)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          padding: '6px 14px', borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(255,255,255,0.06)', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em',
        }}>{drop.price}</div>

      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', gap: '4px' }}>
        <button onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', transition: 'all 0.2s' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill={liked ? '#3b82f6' : 'none'} stroke={liked ? '#3b82f6' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        </button>
        <button onClick={() => document.getElementById('comment-input')?.focus()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', transition: 'all 0.2s' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
        {drop.website && (
          <a href={drop.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={handleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', transition: 'all 0.2s' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill={saved ? '#3b82f6' : 'none'} stroke={saved ? '#3b82f6' : 'var(--text-secondary)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>

      {/* Likes */}
      <div style={{ padding: '0 16px', fontSize: '14px', fontWeight: 600, color: '#fff' }}>
        {formatNumber(likeCount)} likes
      </div>

      {/* Title + description */}
      <div style={{ padding: '8px 16px 0' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.03em' }}>{drop.title}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{drop.description}</p>
      </div>

      {/* Countdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', margin: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Drops in</span>
        <CountdownTimer dropTime={drop.dropTime} />
      </div>



      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '8px 16px 16px', gap: '8px' }}>
        {[
          { label: 'Views', value: formatNumber(drop.views || 0) },
          { label: 'Upvotes', value: formatNumber(likeCount) },
          { label: 'Comments', value: formatNumber(comments.length) },
          { label: 'Saves', value: formatNumber(saves) },
        ].map((s) => (
          <div key={s.label} style={{
            textAlign: 'center', padding: '12px 8px', borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#3b82f6', fontFamily: "'Sora', sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '4px', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Comments */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px', color: '#fff', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em' }}>Comments</div>
        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            id="comment-input"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-full)', fontSize: '13px',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#fff', outline: 'none',
              transition: 'all 0.25s ease', letterSpacing: '-0.01em',
            }}
          />
          <button type="submit" disabled={posting || !newComment.trim()} style={{
            padding: '10px 20px', borderRadius: 'var(--radius-full)',
            background: (posting || !newComment.trim()) ? 'rgba(255,255,255,0.04)' : '#3b82f6',
            color: '#fff', fontWeight: 600, fontSize: '13px', border: 'none',
            cursor: (posting || !newComment.trim()) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', flexShrink: 0,
            fontFamily: "'Sora', sans-serif",
          }}>{posting ? '...' : 'Post'}</button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {comments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No comments yet. Be the first!
            </div>
          )}
          {comments.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59,130,246,0.08)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', color: '#60a5fa', fontWeight: 600,
              }}>{c.user[0]?.toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, color: '#fff', marginRight: '6px' }}>{c.user}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{c.text}</span>
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  {c.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
