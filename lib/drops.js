// Mock data for Dropamyn MVP
export const categories = [
  { id: 'all', name: 'All Drops', icon: '🔥' },
  { id: 'sneakers', name: 'Sneakers', icon: '👟' },
  { id: 'tech', name: 'Tech', icon: '💻' },
  { id: 'streetwear', name: 'Streetwear', icon: '👕' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'ai-tools', name: 'AI Tools', icon: '🤖' },
  { id: 'creator-merch', name: 'Creator Merch', icon: '🎨' },
  { id: 'limited', name: 'Limited Edition', icon: '💎' },
];

const now = new Date();
const hours = (h) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();
const days = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString();

export const drops = [
  {
    id: '1',
    title: 'Air Max 2030 "Midnight Blue"',
    brand: { name: 'Nike', logo: 'https://www.google.com/s2/favicons?domain=nike.com&sz=128' },
    category: 'sneakers',
    description: 'The future of Air Max is here. Featuring revolutionary ReactX foam and a holographic Swoosh, the Air Max 2030 pushes boundaries in comfort and style.',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    dropTime: hours(48),
    price: '$220',
    hypeScore: 94,
    engagement: { likes: 12400, comments: 3200, saves: 8900, views: 145000 },
    featured: true,
    website: 'https://nike.com',
    accessType: 'raffle',
  },
  {
    id: '2',
    title: 'Vision Pro 2',
    brand: { name: 'Apple', logo: 'https://www.google.com/s2/favicons?domain=apple.com&sz=128' },
    category: 'tech',
    description: 'The next generation of spatial computing. Lighter, faster, and with an all-new M4 chip. Experience the future of work and entertainment.',
    imageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80',
    dropTime: hours(6),
    price: '$2,999',
    hypeScore: 97,
    engagement: { likes: 34000, comments: 12000, saves: 28000, views: 520000 },
    featured: true,
    website: 'https://apple.com',
  },
  {
    id: '3',
    title: 'Limited Edition Hoodie',
    brand: { name: 'MrBeast', logo: 'https://www.google.com/s2/favicons?domain=shopmrbeast.com&sz=128' },
    category: 'creator-merch',
    description: 'Only 5,000 ever made. Each hoodie comes with a unique code that could unlock a $10,000 prize. Premium heavyweight cotton.',
    imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80',
    dropTime: days(1),
    price: '$85',
    hypeScore: 89,
    engagement: { likes: 8700, comments: 4100, saves: 6200, views: 98000 },
    featured: false,
    website: 'https://shopmrbeast.com',
  },
  {
    id: '4',
    title: 'WH-2000XM6 Headphones',
    brand: { name: 'Sony', logo: 'https://www.google.com/s2/favicons?domain=sony.com&sz=128' },
    category: 'tech',
    description: 'Industry-leading noise cancellation meets spatial audio. 40-hour battery and AI-powered adaptive sound control.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    dropTime: hours(3),
    price: '$349',
    hypeScore: 86,
    engagement: { likes: 6800, comments: 1900, saves: 4500, views: 78000 },
    featured: false,
    website: 'https://sony.com',
  },
  {
    id: '5',
    title: 'Retro Jordan x Travis Scott',
    brand: { name: 'Jordan', logo: 'https://www.google.com/s2/favicons?domain=nike.com&sz=128' },
    category: 'sneakers',
    description: 'The most anticipated collab of the year. Reverse mocha colorway with cactus jack branding. Ultra-limited release.',
    imageUrl: 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=800&q=80',
    dropTime: days(3),
    price: '$185',
    hypeScore: 98,
    engagement: { likes: 45000, comments: 18000, saves: 38000, views: 680000 },
    featured: true,
    website: 'https://nike.com/jordan',
  },
  {
    id: '6',
    title: 'Summer 2026 Collection',
    brand: { name: 'Supreme', logo: 'https://www.google.com/s2/favicons?domain=supremenewyork.com&sz=128' },
    category: 'streetwear',
    description: 'Supreme drops its Summer 2026 collection featuring bold graphics and the iconic box logo tees in new colorways.',
    imageUrl: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=800&q=80',
    dropTime: days(5),
    price: '$48 - $298',
    hypeScore: 91,
    engagement: { likes: 15000, comments: 6700, saves: 12000, views: 210000 },
    featured: false,
    website: 'https://supremenewyork.com',
  },
  {
    id: '7',
    title: 'RTX 6090 GPU',
    brand: { name: 'NVIDIA', logo: 'https://www.google.com/s2/favicons?domain=nvidia.com&sz=128' },
    category: 'tech',
    description: 'The most powerful consumer GPU ever. 48GB GDDR7, Blackwell architecture, native 8K gaming, DLSS 5.0.',
    imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80',
    dropTime: days(7),
    price: '$1,999',
    hypeScore: 96,
    engagement: { likes: 28000, comments: 9500, saves: 22000, views: 430000 },
    featured: true,
    website: 'https://nvidia.com',
  },
  {
    id: '8',
    title: 'Fortnite x Dragon Ball Z',
    brand: { name: 'Epic Games', logo: 'https://www.google.com/s2/favicons?domain=epicgames.com&sz=128' },
    category: 'gaming',
    description: 'Goku, Vegeta, and more arrive in Fortnite with custom emotes, pickaxes, and a limited-time Kamehameha mythic.',
    imageUrl: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&q=80',
    dropTime: hours(12),
    price: '$19.99',
    hypeScore: 82,
    engagement: { likes: 9200, comments: 3800, saves: 5600, views: 120000 },
    featured: false,
    website: 'https://fortnite.com',
  },
  {
    id: '9',
    title: 'GPT-5 Pro',
    brand: { name: 'OpenAI', logo: 'https://www.google.com/s2/favicons?domain=openai.com&sz=128' },
    category: 'ai-tools',
    description: 'The most advanced AI model. Native multimodal reasoning, real-time video understanding, production-ready code generation.',
    imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
    dropTime: days(2),
    price: '$200/mo',
    hypeScore: 93,
    engagement: { likes: 18000, comments: 7200, saves: 14000, views: 310000 },
    featured: true,
    website: 'https://openai.com',
  },
  {
    id: '10',
    title: 'Model S Plaid+',
    brand: { name: 'Tesla', logo: 'https://www.google.com/s2/favicons?domain=tesla.com&sz=128' },
    category: 'tech',
    description: 'The fastest production car ever. 0-60 in 1.9 seconds, 520 mile range, new yoke-free steering with haptic feedback.',
    imageUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80',
    dropTime: days(14),
    price: '$129,990',
    hypeScore: 88,
    engagement: { likes: 11000, comments: 4300, saves: 7800, views: 165000 },
    featured: false,
    website: 'https://tesla.com',
  },
  {
    id: '11',
    title: 'Yeezy Foam RNNR "Ocean"',
    brand: { name: 'Yeezy', logo: 'https://www.google.com/s2/favicons?domain=adidas.com&sz=128' },
    category: 'sneakers',
    description: 'Deep ocean blue Foam Runner with glow-in-the-dark sole. Made from algae-based EVA foam.',
    imageUrl: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&q=80',
    dropTime: hours(18),
    price: '$90',
    hypeScore: 79,
    engagement: { likes: 5400, comments: 2100, saves: 3900, views: 67000 },
    featured: false,
    website: 'https://adidas.com/yeezy',
  },
  {
    id: '12',
    title: 'Figma AI Design Suite',
    brand: { name: 'Figma', logo: 'https://www.google.com/s2/favicons?domain=figma.com&sz=128' },
    category: 'ai-tools',
    description: 'Design with AI. Auto-layout, smart color suggestions, and one-click prototyping powered by AI.',
    imageUrl: 'https://images.unsplash.com/photo-1581291518633-83b4eef1d2f8?w=800&q=80',
    dropTime: days(4),
    price: '$22/mo',
    hypeScore: 76,
    engagement: { likes: 4200, comments: 1600, saves: 3100, views: 52000 },
    featured: false,
    website: 'https://figma.com',
  },
  {
    id: '13',
    title: 'Xbox Series X Pro',
    brand: { name: 'Xbox', logo: 'https://www.google.com/s2/favicons?domain=xbox.com&sz=128' },
    category: 'gaming',
    description: 'Native 8K gaming at 120fps. 2TB SSD, ray tracing 2.0, backward compatibility with every Xbox game ever.',
    imageUrl: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800&q=80',
    dropTime: days(10),
    price: '$599',
    hypeScore: 85,
    engagement: { likes: 7600, comments: 2800, saves: 5200, views: 95000 },
    featured: false,
    website: 'https://xbox.com',
  },
  {
    id: '14',
    title: 'Palace x Gucci Collab',
    brand: { name: 'Palace', logo: 'https://www.google.com/s2/favicons?domain=palaceskateboards.com&sz=128' },
    category: 'limited',
    description: 'London streetwear meets Italian luxury. Limited skatedecks, leather jackets, and monogrammed beanies.',
    imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
    dropTime: days(6),
    price: '$120 - $3,500',
    hypeScore: 90,
    engagement: { likes: 13000, comments: 5400, saves: 10000, views: 188000 },
    featured: true,
    website: 'https://palaceskateboards.com',
  },
  {
    id: '15',
    title: 'Pixel 11 Ultra',
    brand: { name: 'Google', logo: 'https://www.google.com/s2/favicons?domain=google.com&sz=128' },
    category: 'tech',
    description: 'AI-first smartphone. Gemini built-in, 200MP camera with Night Sight 3.0, 7 years of updates.',
    imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80',
    dropTime: days(8),
    price: '$1,099',
    hypeScore: 83,
    engagement: { likes: 6100, comments: 2300, saves: 4000, views: 72000 },
    featured: false,
    website: 'https://store.google.com',
  },
  {
    id: '16',
    title: 'KSI x Prime Energy',
    brand: { name: 'PRIME', logo: 'https://www.google.com/s2/favicons?domain=drinkprime.com&sz=128' },
    category: 'creator-merch',
    description: 'Limited edition KSI flavor with golden can. Each case includes meet-and-greet ticket chances.',
    imageUrl: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=800&q=80',
    dropTime: hours(36),
    price: '$29.99',
    hypeScore: 77,
    engagement: { likes: 4800, comments: 1800, saves: 3500, views: 58000 },
    featured: false,
    website: 'https://drinkprime.com',
  },
];

// Utility functions
export function getDropsByCategory(category) {
  if (category === 'all') return drops;
  return drops.filter(d => d.category === category);
}

export function getTrendingDrops() {
  return [...drops].sort((a, b) => b.hypeScore - a.hypeScore).slice(0, 10);
}

export function getDropById(id) {
  return drops.find(d => d.id === id);
}

export function getFeaturedDrops() {
  return drops.filter(d => d.featured);
}

export function getDropsByDate(targetDate) {
  return drops.filter(d => {
    const dropDate = new Date(d.dropTime);
    return dropDate.toDateString() === targetDate.toDateString();
  });
}

export function getUpcomingDates() {
  const dates = {};
  drops.forEach(d => {
    const date = new Date(d.dropTime).toDateString();
    if (!dates[date]) dates[date] = [];
    dates[date].push(d);
  });
  return Object.entries(dates)
    .map(([date, items]) => ({ date: new Date(date), drops: items }))
    .sort((a, b) => a.date - b.date);
}

export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
