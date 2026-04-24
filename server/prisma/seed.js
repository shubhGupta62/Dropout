const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const now = new Date();
const hours = (h) => new Date(now.getTime() + h * 60 * 60 * 1000);
const days = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

async function main() {
  console.log('🌱 Seeding database...');

  // Create brands
  const brands = await Promise.all([
    prisma.brand.upsert({ where: { name: 'Nike' }, update: { logo: 'https://www.google.com/s2/favicons?domain=nike.com&sz=128', website: 'https://nike.com' }, create: { name: 'Nike', logo: 'https://www.google.com/s2/favicons?domain=nike.com&sz=128', website: 'https://nike.com' } }),
    prisma.brand.upsert({ where: { name: 'Apple' }, update: { logo: 'https://www.google.com/s2/favicons?domain=apple.com&sz=128', website: 'https://apple.com' }, create: { name: 'Apple', logo: 'https://www.google.com/s2/favicons?domain=apple.com&sz=128', website: 'https://apple.com' } }),
    prisma.brand.upsert({ where: { name: 'MrBeast' }, update: { logo: 'https://www.google.com/s2/favicons?domain=shopmrbeast.com&sz=128', website: 'https://shopmrbeast.com' }, create: { name: 'MrBeast', logo: 'https://www.google.com/s2/favicons?domain=shopmrbeast.com&sz=128', website: 'https://shopmrbeast.com' } }),
    prisma.brand.upsert({ where: { name: 'Sony' }, update: { logo: 'https://www.google.com/s2/favicons?domain=sony.com&sz=128', website: 'https://sony.com' }, create: { name: 'Sony', logo: 'https://www.google.com/s2/favicons?domain=sony.com&sz=128', website: 'https://sony.com' } }),
    prisma.brand.upsert({ where: { name: 'Jordan' }, update: { logo: 'https://www.google.com/s2/favicons?domain=nike.com&sz=128', website: 'https://nike.com/jordan' }, create: { name: 'Jordan', logo: 'https://www.google.com/s2/favicons?domain=nike.com&sz=128', website: 'https://nike.com/jordan' } }),
    prisma.brand.upsert({ where: { name: 'Supreme' }, update: { logo: 'https://www.google.com/s2/favicons?domain=supremenewyork.com&sz=128', website: 'https://supremenewyork.com' }, create: { name: 'Supreme', logo: 'https://www.google.com/s2/favicons?domain=supremenewyork.com&sz=128', website: 'https://supremenewyork.com' } }),
    prisma.brand.upsert({ where: { name: 'NVIDIA' }, update: { logo: 'https://www.google.com/s2/favicons?domain=nvidia.com&sz=128', website: 'https://nvidia.com' }, create: { name: 'NVIDIA', logo: 'https://www.google.com/s2/favicons?domain=nvidia.com&sz=128', website: 'https://nvidia.com' } }),
    prisma.brand.upsert({ where: { name: 'Epic Games' }, update: { logo: 'https://www.google.com/s2/favicons?domain=epicgames.com&sz=128', website: 'https://epicgames.com' }, create: { name: 'Epic Games', logo: 'https://www.google.com/s2/favicons?domain=epicgames.com&sz=128', website: 'https://epicgames.com' } }),
    prisma.brand.upsert({ where: { name: 'OpenAI' }, update: { logo: 'https://www.google.com/s2/favicons?domain=openai.com&sz=128', website: 'https://openai.com' }, create: { name: 'OpenAI', logo: 'https://www.google.com/s2/favicons?domain=openai.com&sz=128', website: 'https://openai.com' } }),
    prisma.brand.upsert({ where: { name: 'Tesla' }, update: { logo: 'https://www.google.com/s2/favicons?domain=tesla.com&sz=128', website: 'https://tesla.com' }, create: { name: 'Tesla', logo: 'https://www.google.com/s2/favicons?domain=tesla.com&sz=128', website: 'https://tesla.com' } }),
    prisma.brand.upsert({ where: { name: 'Yeezy' }, update: { logo: 'https://www.google.com/s2/favicons?domain=adidas.com&sz=128', website: 'https://adidas.com/yeezy' }, create: { name: 'Yeezy', logo: 'https://www.google.com/s2/favicons?domain=adidas.com&sz=128', website: 'https://adidas.com/yeezy' } }),
    prisma.brand.upsert({ where: { name: 'Figma' }, update: { logo: 'https://www.google.com/s2/favicons?domain=figma.com&sz=128', website: 'https://figma.com' }, create: { name: 'Figma', logo: 'https://www.google.com/s2/favicons?domain=figma.com&sz=128', website: 'https://figma.com' } }),
    prisma.brand.upsert({ where: { name: 'Xbox' }, update: { logo: 'https://www.google.com/s2/favicons?domain=xbox.com&sz=128', website: 'https://xbox.com' }, create: { name: 'Xbox', logo: 'https://www.google.com/s2/favicons?domain=xbox.com&sz=128', website: 'https://xbox.com' } }),
    prisma.brand.upsert({ where: { name: 'Palace' }, update: { logo: 'https://www.google.com/s2/favicons?domain=palaceskateboards.com&sz=128', website: 'https://palaceskateboards.com' }, create: { name: 'Palace', logo: 'https://www.google.com/s2/favicons?domain=palaceskateboards.com&sz=128', website: 'https://palaceskateboards.com' } }),
    prisma.brand.upsert({ where: { name: 'Google' }, update: { logo: 'https://www.google.com/s2/favicons?domain=google.com&sz=128', website: 'https://store.google.com' }, create: { name: 'Google', logo: 'https://www.google.com/s2/favicons?domain=google.com&sz=128', website: 'https://store.google.com' } }),
    prisma.brand.upsert({ where: { name: 'PRIME' }, update: { logo: 'https://www.google.com/s2/favicons?domain=drinkprime.com&sz=128', website: 'https://drinkprime.com' }, create: { name: 'PRIME', logo: 'https://www.google.com/s2/favicons?domain=drinkprime.com&sz=128', website: 'https://drinkprime.com' } }),
  ]);

  const brandMap = {};
  brands.forEach(b => { brandMap[b.name] = b.id; });

  // Create drops
  const dropsData = [
    { title: 'Air Max 2030 "Midnight Blue"', brand: 'Nike', category: 'sneakers', description: 'The future of Air Max is here. Featuring revolutionary ReactX foam and a holographic Swoosh.', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', dropTime: hours(48), price: '$220', hypeScore: 94, likes: 12400, views: 145000, featured: true, website: 'https://nike.com' },
    { title: 'Vision Pro 2', brand: 'Apple', category: 'tech', description: 'The next generation of spatial computing. Lighter, faster, with an all-new M4 chip.', imageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80', dropTime: hours(6), price: '$2,999', hypeScore: 97, likes: 34000, views: 520000, featured: true, website: 'https://apple.com' },
    { title: 'Limited Edition Hoodie', brand: 'MrBeast', category: 'creator-merch', description: 'Only 5,000 ever made. Each hoodie comes with a unique code that could unlock a $10,000 prize.', imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80', dropTime: days(1), price: '$85', hypeScore: 89, likes: 8700, views: 98000, featured: false, website: 'https://shopmrbeast.com' },
    { title: 'WH-2000XM6 Headphones', brand: 'Sony', category: 'tech', description: 'Industry-leading noise cancellation meets spatial audio. 40-hour battery.', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', dropTime: hours(3), price: '$349', hypeScore: 86, likes: 6800, views: 78000, featured: false, website: 'https://sony.com' },
    { title: 'Retro Jordan x Travis Scott', brand: 'Jordan', category: 'sneakers', description: 'The most anticipated collab of the year. Reverse mocha colorway.', imageUrl: 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=800&q=80', dropTime: days(3), price: '$185', hypeScore: 98, likes: 45000, views: 680000, featured: true, website: 'https://nike.com/jordan' },
    { title: 'Summer 2026 Collection', brand: 'Supreme', category: 'streetwear', description: 'Supreme drops its Summer 2026 collection with bold graphics and iconic box logo tees.', imageUrl: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=800&q=80', dropTime: days(5), price: '$48 - $298', hypeScore: 91, likes: 15000, views: 210000, featured: false, website: 'https://supremenewyork.com' },
    { title: 'RTX 6090 GPU', brand: 'NVIDIA', category: 'tech', description: 'The most powerful consumer GPU ever. 48GB GDDR7, Blackwell architecture.', imageUrl: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=800&q=80', dropTime: days(7), price: '$1,999', hypeScore: 96, likes: 28000, views: 430000, featured: true, website: 'https://nvidia.com' },
    { title: 'Fortnite x Dragon Ball Z', brand: 'Epic Games', category: 'gaming', description: 'Goku, Vegeta, and more arrive in Fortnite with custom emotes and mythics.', imageUrl: 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800&q=80', dropTime: hours(12), price: '$19.99', hypeScore: 82, likes: 9200, views: 120000, featured: false, website: 'https://fortnite.com' },
    { title: 'GPT-5 Pro', brand: 'OpenAI', category: 'ai-tools', description: 'The most advanced AI model. Native multimodal reasoning, real-time video understanding.', imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80', dropTime: days(2), price: '$200/mo', hypeScore: 93, likes: 18000, views: 310000, featured: true, website: 'https://openai.com' },
    { title: 'Model S Plaid+', brand: 'Tesla', category: 'tech', description: 'The fastest production car ever. 0-60 in 1.9 seconds, 520 mile range.', imageUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&q=80', dropTime: days(14), price: '$129,990', hypeScore: 88, likes: 11000, views: 165000, featured: false, website: 'https://tesla.com' },
    { title: 'Yeezy Foam RNNR "Ocean"', brand: 'Yeezy', category: 'sneakers', description: 'Deep ocean blue Foam Runner with glow-in-the-dark sole.', imageUrl: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800&q=80', dropTime: hours(18), price: '$90', hypeScore: 79, likes: 5400, views: 67000, featured: false, website: 'https://adidas.com/yeezy' },
    { title: 'Figma AI Design Suite', brand: 'Figma', category: 'ai-tools', description: 'Design with AI. Auto-layout, smart color suggestions, one-click prototyping.', imageUrl: 'https://images.unsplash.com/photo-1581291518633-83b4eef1d2f8?w=800&q=80', dropTime: days(4), price: '$22/mo', hypeScore: 76, likes: 4200, views: 52000, featured: false, website: 'https://figma.com' },
    { title: 'Xbox Series X Pro', brand: 'Xbox', category: 'gaming', description: 'Native 8K gaming at 120fps. 2TB SSD, ray tracing 2.0.', imageUrl: 'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800&q=80', dropTime: days(10), price: '$599', hypeScore: 85, likes: 7600, views: 95000, featured: false, website: 'https://xbox.com' },
    { title: 'Palace x Gucci Collab', brand: 'Palace', category: 'limited', description: 'London streetwear meets Italian luxury. Limited skatedecks and leather jackets.', imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80', dropTime: days(6), price: '$120 - $3,500', hypeScore: 90, likes: 13000, views: 188000, featured: true, website: 'https://palaceskateboards.com' },
    { title: 'Pixel 11 Ultra', brand: 'Google', category: 'tech', description: 'AI-first smartphone. Gemini built-in, 200MP camera, 7 years of updates.', imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80', dropTime: days(8), price: '$1,099', hypeScore: 83, likes: 6100, views: 72000, featured: false, website: 'https://store.google.com' },
    { title: 'KSI x Prime Energy', brand: 'PRIME', category: 'creator-merch', description: 'Limited edition KSI flavor with golden can. Meet-and-greet ticket chances.', imageUrl: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=800&q=80', dropTime: hours(36), price: '$29.99', hypeScore: 77, likes: 4800, views: 58000, featured: false, website: 'https://drinkprime.com' },
  ];

  const existingSeedTitles = new Set(
    (await prisma.drop.findMany({ select: { title: true } })).map((drop) => drop.title)
  );

  for (const d of dropsData) {
    if (existingSeedTitles.has(d.title)) continue;

    await prisma.drop.create({
      data: {
        title: d.title,
        description: d.description,
        imageUrl: d.imageUrl,
        price: d.price,
        category: d.category,
        hypeScore: d.hypeScore,
        dropTime: d.dropTime,
        featured: d.featured,
        website: d.website,
        brandId: brandMap[d.brand],
        views: d.views,
      },
    });
  }

  // Create a test user (login: demo@dropspace.app / demo123)
  const hashedPw = await bcrypt.hash('demo123', 10);
  await prisma.user.upsert({
    where: { email: 'demo@dropspace.app' },
    update: { name: 'Demo User', password: hashedPw, avatar: null },
    create: { email: 'demo@dropspace.app', name: 'Demo User', password: hashedPw, avatar: null },
  });

  const dropCount = await prisma.drop.count();
  const brandCount = await prisma.brand.count();
  console.log(`✅ Seeded ${brandCount} brands, ${dropCount} drops, 1 user`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
