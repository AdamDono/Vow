import { db, client } from './client.js'
import {
  users,
  profiles,
  userPhotos,
  userInterests,
  relationships,
  dailyCheckins,
  sharedGoals,
  timelineMilestones,
} from './schema/index.js'
import bcrypt from 'bcryptjs'

async function seed() {
  console.log('🌱 Starting Vow database seed on Neon Postgres...')

  const passwordHash = await bcrypt.hash('password123', 6)
  console.log('🔑 Password hash generated.')

  // 1. Create Couple Demo Users (Adam & Sarah)
  console.log('👤 Inserting Adam & Sarah...')
  const [adamUser] = await db
    .insert(users)
    .values({
      email: 'adam@vow.app',
      passwordHash,
      relationshipStatus: 'coupled',
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { relationshipStatus: 'coupled' },
    })
    .returning()

  await db
    .insert(profiles)
    .values({
      userId: adamUser.id,
      firstName: 'Adam',
      lastName: 'Donoghue',
      age: 27,
      city: 'Cape Town, SA',
      gender: 'Man',
      bio: 'Product builder, coffee enthusiast, and lover of coastal hikes. Believer in intentional relationships.',
      lookingFor: 'Long-term relationship',
      vouchRating: 98,
      isVerified: true,
    })
    .onConflictDoNothing()

  await db
    .insert(userPhotos)
    .values({
      userId: adamUser.id,
      url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80',
      orderIndex: 0,
      isPrimary: true,
    })

  await db.insert(userInterests).values([
    { userId: adamUser.id, interest: '☕ Coffee' },
    { userId: adamUser.id, interest: '🏃 Running' },
    { userId: adamUser.id, interest: '📚 Reading' },
  ])

  const [sarahUser] = await db
    .insert(users)
    .values({
      email: 'sarah@vow.app',
      passwordHash,
      relationshipStatus: 'coupled',
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { relationshipStatus: 'coupled' },
    })
    .returning()

  await db
    .insert(profiles)
    .values({
      userId: sarahUser.id,
      firstName: 'Sarah',
      lastName: 'Miller',
      age: 26,
      city: 'Cape Town, SA',
      gender: 'Woman',
      bio: 'Architect & weekend painter. Always planning our next road trip and perfecting homemade pasta.',
      lookingFor: 'Long-term relationship',
      vouchRating: 99,
      isVerified: true,
    })
    .onConflictDoNothing()

  await db
    .insert(userPhotos)
    .values({
      userId: sarahUser.id,
      url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80',
      orderIndex: 0,
      isPrimary: true,
    })

  // 2. Create Active Relationship between Adam & Sarah
  console.log('💍 Creating Adam & Sarah relationship...')
  const [coupleRel] = await db
    .insert(relationships)
    .values({
      partner1Id: adamUser.id,
      partner2Id: sarahUser.id,
      status: 'active',
      anniversaryDate: '2024-02-14',
      harmonyScore: 87,
    })
    .returning()

  // 3. Couple Daily Check-ins (Double-Blind Demo)
  console.log('📝 Creating daily check-ins...')
  const today = new Date().toISOString().split('T')[0]
  await db.insert(dailyCheckins).values([
    {
      relationshipId: coupleRel.id,
      userId: adamUser.id,
      partnerId: sarahUser.id,
      moodScore: 5,
      promptQuestion: 'What made you feel loved today?',
      promptAnswer: 'When you surprised me with morning espresso before my big pitch.',
      checkinDate: today,
      isSealed: false,
    },
    {
      relationshipId: coupleRel.id,
      userId: sarahUser.id,
      partnerId: adamUser.id,
      moodScore: 5,
      promptQuestion: 'What made you feel loved today?',
      promptAnswer: 'Cooking dinner together without checking our phones.',
      checkinDate: today,
      isSealed: false,
    },
  ])

  // 4. Shared Goals & Vows
  console.log('🎯 Creating shared goals...')
  await db.insert(sharedGoals).values([
    {
      relationshipId: coupleRel.id,
      title: 'Summer Trip to the Amalfi Coast',
      description: 'Book flights and save $3,000 in our joint adventure fund.',
      targetDate: '2026-12-01',
      isCompleted: false,
    },
    {
      relationshipId: coupleRel.id,
      title: 'Weekly Sunday Screen-Free Morning',
      description: 'Coffee, books, and breakfast on the balcony with zero phones.',
      targetDate: '2026-10-01',
      isCompleted: true,
      completedAt: new Date(),
    },
  ])

  // 5. Timeline Milestones
  console.log('📖 Creating timeline milestones...')
  await db.insert(timelineMilestones).values([
    {
      relationshipId: coupleRel.id,
      title: 'Official Vow Commitment',
      description: 'Accepted our Vow Proposal and entered Couples Mode.',
      eventDate: '2024-02-14',
      photoUrl: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&q=80',
    },
    {
      relationshipId: coupleRel.id,
      title: 'First Road Trip to Franschhoek',
      description: 'Wine tasting, rainy cabin evening, and endless laughing.',
      eventDate: '2024-06-20',
      photoUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
    },
  ])

  // 6. Seed Singles for Discovery Mode
  console.log('💘 Creating singles for discovery...')
  const singlesData = [
    {
      name: 'Elena',
      age: 25,
      city: 'Cape Town',
      bio: 'Interior designer & film photographer. Looking for deep conversations over natural wine.',
      interests: ['🎨 Art', '🍷 Wine', '📸 Photography', '🧘 Yoga'],
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80',
    },
    {
      name: 'Marcus',
      age: 28,
      city: 'Johannesburg',
      bio: 'Software engineer & trail runner. Looking for someone with ambition and kindness.',
      interests: ['🏃 Running', '☕ Coffee', '🎮 Gaming', '✈️ Travel'],
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    },
    {
      name: 'Sofia',
      age: 24,
      city: 'Durban',
      bio: 'Marine biologist & surfer. The ocean is my second home.',
      interests: ['🏄 Surfing', '🌿 Nature', '🐾 Pets', '📚 Reading'],
      photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80',
    },
  ]

  for (const s of singlesData) {
    const [singleUser] = await db
      .insert(users)
      .values({
        email: `${s.name.toLowerCase()}@vow.app`,
        passwordHash,
        relationshipStatus: 'single',
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { relationshipStatus: 'single' },
      })
      .returning()

    await db
      .insert(profiles)
      .values({
        userId: singleUser.id,
        firstName: s.name,
        lastName: 'Vow',
        age: s.age,
        city: s.city,
        gender: 'Woman',
        bio: s.bio,
        lookingFor: 'Long-term relationship',
        vouchRating: 95,
        isVerified: true,
      })
      .onConflictDoNothing()

    await db
      .insert(userPhotos)
      .values({
        userId: singleUser.id,
        url: s.photo,
        orderIndex: 0,
        isPrimary: true,
      })

    for (const interest of s.interests) {
      await db.insert(userInterests).values({
        userId: singleUser.id,
        interest,
      })
    }
  }

  console.log('✅ Neon Postgres database successfully seeded with Vow mock data!')
  await client.end()
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Error during database seed:', err)
  process.exit(1)
})
