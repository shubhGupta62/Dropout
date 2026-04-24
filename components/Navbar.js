'use client';

import Link from 'next/link';
import { GlassFilter, GlassPanelLayers } from './LiquidGlass';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  getNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  markNotificationRead,
  processDueNotifications,
  requestNotificationPermission,
} from '../lib/notifications';
import {
  getStoredUserSnapshot,
  getStoredToken,
  parseStoredUser,
  restoreStoredUserSession,
  subscribeToStoredUser,
} from '../lib/userStorage';
import { categories } from '../lib/drops';

const navItems = [
  { href: '/feed', label: 'Home', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  )},
  { href: '/trending', label: 'Trending', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
  )},
  { href: '/search', label: 'Search', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  )},
  { href: '/calendar', label: 'Calendar', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  )},
  { href: '/saved', label: 'Saved', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
  )},
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [desktopCatOpen, setDesktopCatOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState(() => ([]));
  const [unreadCount, setUnreadCount] = useState(() => (0));
  const rawStoredUser = useSyncExternalStore(subscribeToStoredUser, getStoredUserSnapshot, () => null);
  const storedUser = useMemo(() => parseStoredUser(rawStoredUser), [rawStoredUser]);
  const loggedIn = !!storedUser;
  const isBrand = storedUser?.role === 'brand';
  const userName = storedUser?.name || '';
  const userAvatar = storedUser?.avatar || '';

  const syncNotifications = () => {
    setNotifications(getNotifications());
    setUnreadCount(getUnreadNotificationsCount());
  };

  useEffect(() => {
    if (!storedUser && getStoredToken()) {
      restoreStoredUserSession();
    }

    const handleNotificationsChanged = () => syncNotifications();
    const intervalId = window.setInterval(() => {
      processDueNotifications();
      syncNotifications();
    }, 30000);

    window.addEventListener('dropout-notifications-changed', handleNotificationsChanged);

    // Scroll listener for mobile header
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('dropout-notifications-changed', handleNotificationsChanged);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [pathname, storedUser]);

  const visibleNavItems = navItems;
  const sidebarWidth = expanded ? 240 : 72;

  const openNotifications = async () => {
    setNotificationOpen((current) => !current);
    processDueNotifications();
    syncNotifications();
    await requestNotificationPermission();
  };

  const handleNotificationClick = (notification) => {
    markNotificationRead(notification.id);
    setNotificationOpen(false);
    router.push(`/drop/${notification.dropId}`);
  };

  const formatNotificationTime = (notification) => {
    const date = new Date(notification.dropTime);
    if (Number.isNaN(date.getTime())) return 'Drop scheduled';
    if (notification.notifiedAt) return 'Live now';
    return `Drops ${date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
  };

  return (
    <>
      {/* SVG filters for liquid glass */}
      <GlassFilter />

      {/* ===== LEFT SIDEBAR (Desktop) ===== */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{
          width: `${sidebarWidth}px`,
          transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0, top: 0, bottom: 0,
          zIndex: 50,
          overflow: 'hidden',
          background: 'rgba(5,5,10,0.4)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 0 6px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.1), inset 1px 1px 0.5px -0.5px rgba(255,255,255,0.15), inset -1px 0 0.5px -0.5px rgba(255,255,255,0.08), inset 0 0 8px 4px rgba(255,255,255,0.03), 4px 0 20px rgba(0,0,0,0.15)',
        }}
        className="hidden md:flex"
      >
        {/* Clean frosted glass layers (no SVG distortion) */}
        <GlassPanelLayers />
        {/* Content wrapper — must be above glass layers */}
        <div style={{ position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* ---- Logo ---- */}
        <Link
          href="/feed"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: expanded ? '28px 20px 36px' : '28px 0 36px',
            justifyContent: expanded ? 'flex-start' : 'center',
            textDecoration: 'none',
            transition: 'padding 0.3s ease',
          }}
        >
          {expanded ? (
            <span style={{
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              color: '#fff',
              whiteSpace: 'nowrap',
              fontFamily: "'Sora', sans-serif",
            }}>
              <span style={{ color: '#fff' }}>Drop</span><span style={{ color: '#3b82f6' }}>amyn</span>
            </span>
          ) : (
            <span style={{ fontSize: '24px', fontWeight: 800, color: '#3b82f6', fontFamily: "'Sora', sans-serif" }}>D</span>
          )}
        </Link>

        {/* ---- Nav Items ---- */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px' }}>
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '11px 12px',
                  borderRadius: '12px',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '14px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  minHeight: '44px',
                  letterSpacing: '-0.01em',
                  position: 'relative',
                }}
                onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}}
                onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <div style={{
                    position: 'absolute', left: '0px', top: '50%', transform: 'translateY(-50%)',
                    width: '3px', height: '18px', borderRadius: '0 4px 4px 0',
                    background: '#3b82f6',
                  }} />
                )}
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: '22px', flexShrink: 0,
                  opacity: isActive ? 1 : 0.7,
                  transition: 'opacity 0.2s ease',
                }}>
                  {item.icon}
                </span>
                {expanded && (
                  <span style={{
                    opacity: 1,
                    transition: 'opacity 0.2s ease 0.1s',
                  }}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
          {/* Categories expandable */}
          <div>
            <button
              onClick={() => setDesktopCatOpen(!desktopCatOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                padding: '11px 12px', borderRadius: '12px', border: 'none',
                color: desktopCatOpen ? '#60a5fa' : 'var(--text-secondary)',
                background: desktopCatOpen ? 'rgba(59,130,246,0.06)' : 'transparent',
                cursor: 'pointer', fontSize: '14px', fontWeight: desktopCatOpen ? 600 : 400,
                transition: 'all 0.2s ease', minHeight: '44px', textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (!desktopCatOpen) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}}
              onMouseLeave={(e) => { if (!desktopCatOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', flexShrink: 0, opacity: desktopCatOpen ? 1 : 0.7 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
              </span>
              {expanded && <span style={{ flex: 1 }}>Categories</span>}
              {expanded && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: 'transform 0.2s ease', transform: desktopCatOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              )}
            </button>
            {desktopCatOpen && expanded && (
              <div style={{
                maxHeight: '200px', overflowY: 'auto', scrollbarWidth: 'thin',
                padding: '4px 0 4px 36px',
                display: 'flex', flexDirection: 'column', gap: '1px',
              }}>
                {categories.filter(c => c.id !== 'all').map(cat => (
                  <Link
                    key={cat.id}
                    href={`/feed?category=${cat.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 10px', borderRadius: '8px',
                      fontSize: '13px', color: 'var(--text-secondary)',
                      textDecoration: 'none', transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59,130,246,0.06)'; e.currentTarget.style.color = '#60a5fa'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <span style={{ fontSize: '15px' }}>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* ---- Bottom Items ---- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px 24px' }}>
          {/* Dashboard — brand users only */}
          {loggedIn && isBrand && (
            <Link
              href="/dashboard"
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '11px 12px', borderRadius: '12px',
                color: pathname === '/dashboard' ? '#fff' : 'var(--text-secondary)',
                background: pathname === '/dashboard' ? 'rgba(59,130,246,0.08)' : 'transparent',
                textDecoration: 'none', fontSize: '14px',
                fontWeight: pathname === '/dashboard' ? 600 : 400,
                overflow: 'hidden', whiteSpace: 'nowrap', minHeight: '44px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { if (pathname !== '/dashboard') { e.currentTarget.style.background = 'rgba(59,130,246,0.04)'; e.currentTarget.style.color = '#60a5fa'; }}}
              onMouseLeave={(e) => { if (pathname !== '/dashboard') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </span>
              {expanded && <span>Dashboard</span>}
            </Link>
          )}
          {/* Profile */}
          <Link
            href="/profile"
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '11px 12px', borderRadius: '12px',
              color: pathname === '/profile' ? '#fff' : 'var(--text-secondary)',
              background: pathname === '/profile' ? 'rgba(255,255,255,0.06)' : 'transparent',
              textDecoration: 'none', fontSize: '14px',
              fontWeight: pathname === '/profile' ? 600 : 400,
              overflow: 'hidden', whiteSpace: 'nowrap', minHeight: '44px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { if (pathname !== '/profile') { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff'; }}}
            onMouseLeave={(e) => { if (pathname !== '/profile') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '22px', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </span>
            {expanded && <span>Profile</span>}
          </Link>
        </div>
        </div>{/* end content wrapper */}
      </aside>

      {/* ===== MOBILE TOP HEADER ===== */}
      <div
        className="mobile-top-header"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(5,5,8,0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', height: '52px',
        }}
      >
        {/* Logo — fades out on scroll */}
        <Link href="/feed" style={{
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px',
          transition: 'all 0.3s ease',
          opacity: scrolled ? 0 : 1,
          width: scrolled ? 0 : 'auto',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: "'Sora', sans-serif", letterSpacing: '-0.04em' }}>
            <span style={{ color: '#fff' }}>Drop</span><span style={{ color: '#3b82f6' }}>amyn</span>
          </span>
        </Link>
        {/* Right icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { if (loggedIn) openNotifications(); else router.push('/login'); }}
              style={{ color: notificationOpen ? '#fff' : 'var(--text-muted)', display: 'flex', background: 'none', border: 'none', cursor: 'pointer', padding: 0, position: 'relative' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-6px',
                  minWidth: '16px',
                  height: '16px',
                  borderRadius: '999px',
                  background: '#3b82f6',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notificationOpen && loggedIn && (
              <div style={{
                position: 'absolute',
                top: '34px',
                right: '-8px',
                width: '290px',
                maxHeight: '360px',
                overflowY: 'auto',
                borderRadius: '16px',
                background: 'rgba(8,8,14,0.96)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 22px 50px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                padding: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: "'Sora', sans-serif" }}>Notifications</div>
                  <button
                    onClick={() => { markAllNotificationsRead(); syncNotifications(); }}
                    style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                  >
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, padding: '10px 4px' }}>
                    Save a drop with Notify Me and we&apos;ll alert you here when it goes live.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        border: 'none',
                        cursor: 'pointer',
                        background: notification.readAt ? 'transparent' : 'rgba(59,130,246,0.06)',
                        borderRadius: '12px',
                        padding: '10px',
                        color: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        marginBottom: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{notification.title}</span>
                        {!notification.readAt && (
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{notification.brandName}</div>
                      <div style={{ fontSize: '11px', color: notification.notifiedAt ? '#34d399' : 'var(--text-muted)' }}>
                        {formatNotificationTime(notification)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <Link href={loggedIn ? '/profile' : '/login'} style={{ display: 'flex' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: userAvatar ? `url(${userAvatar}) center/cover` : (loggedIn ? '#3b82f6' : 'rgba(255,255,255,0.06)'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: userAvatar ? '0' : '12px', fontWeight: 600, color: '#fff',
              border: pathname === '/profile' ? '2px solid #3b82f6' : '2px solid transparent',
              overflow: 'hidden',
              transition: 'border-color 0.2s ease',
            }}>
              {!userAvatar && (userName ? userName.charAt(0).toUpperCase() : '?')}
            </div>
          </Link>
        </div>
      </div>

      {/* ===== MOBILE CATEGORIES PANEL ===== */}
      {mobileCatOpen && (
        <>
          <div
            onClick={() => setMobileCatOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 98,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div style={{
            position: 'fixed', bottom: '66px', left: '8px', right: '8px', zIndex: 99,
            background: 'rgba(10,10,18,0.97)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '20px',
            padding: '18px 16px 14px',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(24px)',
            maxHeight: '55vh', overflowY: 'auto',
          }}
            className="mobile-bottom-nav"
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '14px', fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em' }}>
              Categories
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {categories.filter(c => c.id !== 'all').map(cat => (
                <Link
                  key={cat.id}
                  href={`/feed?category=${cat.id}`}
                  onClick={() => setMobileCatOpen(false)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '14px 6px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    textDecoration: 'none', transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{cat.icon}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'center' }}>{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== BOTTOM NAV (Mobile only) ===== */}
      <div
        className="mobile-bottom-nav"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(5,5,8,0.9)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', justifyContent: 'space-around',
          padding: '6px 0 12px',
        }}
      >
        {[
          { href: '/feed', icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>) },
          { href: '/trending', icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>) },
          { href: '/search', icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>) },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '6px 8px',
              color: pathname === item.href ? '#3b82f6' : 'var(--text-muted)',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
              position: 'relative',
            }}
          >
            <span style={{ display: 'flex' }}>{item.icon}</span>
            {pathname === item.href && (
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3b82f6', marginTop: '4px' }} />
            )}
          </Link>
        ))}

        {/* Categories button */}
        <button
          onClick={() => setMobileCatOpen(!mobileCatOpen)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '6px 8px', background: 'none', border: 'none',
            color: mobileCatOpen ? '#3b82f6' : 'var(--text-muted)',
            cursor: 'pointer', transition: 'color 0.2s ease',
            position: 'relative',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
          {mobileCatOpen && (
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3b82f6', marginTop: '4px' }} />
          )}
        </button>

        {/* Saved */}
        <Link
          href="/saved"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '6px 8px',
            color: pathname === '/saved' ? '#3b82f6' : 'var(--text-muted)',
            textDecoration: 'none',
            transition: 'color 0.2s ease',
            position: 'relative',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          {pathname === '/saved' && (
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3b82f6', marginTop: '4px' }} />
          )}
        </Link>
      </div>
    </>
  );
}
