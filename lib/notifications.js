const STORAGE_KEY = 'dropout_notifications';

function canUseBrowserApis() {
  return typeof window !== 'undefined';
}

function readNotifications() {
  if (!canUseBrowserApis()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotifications(items) {
  if (!canUseBrowserApis()) return [];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('dropout-notifications-changed'));
  return items;
}

export function getNotifications() {
  return readNotifications().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getUnreadNotificationsCount() {
  return getNotifications().filter((item) => !item.readAt).length;
}

export function getNotificationForDrop(dropId) {
  return readNotifications().find((item) => item.dropId === dropId) || null;
}

export function toggleDropReminder(drop) {
  const items = readNotifications();
  const existing = items.find((item) => item.dropId === drop.id);

  if (existing) {
    return {
      active: false,
      notifications: writeNotifications(items.filter((item) => item.dropId !== drop.id)),
    };
  }

  const reminder = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${drop.id}-${Date.now()}`,
    dropId: drop.id,
    title: drop.title,
    brandName: drop.brand?.name || 'Unknown brand',
    imageUrl: drop.imageUrl || '',
    dropTime: drop.dropTime,
    createdAt: new Date().toISOString(),
    notifiedAt: null,
    readAt: null,
  };

  return {
    active: true,
    notifications: writeNotifications([reminder, ...items]),
  };
}

export function markNotificationRead(id) {
  const items = readNotifications().map((item) => (
    item.id === id && !item.readAt
      ? { ...item, readAt: new Date().toISOString() }
      : item
  ));

  return writeNotifications(items);
}

export function markAllNotificationsRead() {
  const now = new Date().toISOString();
  return writeNotifications(readNotifications().map((item) => (
    item.readAt ? item : { ...item, readAt: now }
  )));
}

export async function requestNotificationPermission() {
  if (!canUseBrowserApis() || typeof Notification === 'undefined') {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function processDueNotifications(now = new Date()) {
  if (!canUseBrowserApis()) return { updated: [], fired: [] };

  const items = readNotifications();
  const fired = [];

  const updated = items.map((item) => {
    const dropDate = new Date(item.dropTime);
    if (Number.isNaN(dropDate.getTime()) || item.notifiedAt || dropDate > now) {
      return item;
    }

    const nextItem = {
      ...item,
      notifiedAt: now.toISOString(),
      readAt: item.readAt || null,
    };
    fired.push(nextItem);
    return nextItem;
  });

  if (fired.length > 0) {
    writeNotifications(updated);

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      fired.forEach((item) => {
        new Notification(`${item.title} is live`, {
          body: `${item.brandName} just dropped on Dropamyn.`,
          icon: item.imageUrl || undefined,
        });
      });
    }
  }

  return { updated, fired };
}
