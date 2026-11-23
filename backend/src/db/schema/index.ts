import { pgTable, uuid, text, integer, boolean, timestamp, date, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// 1. USERS
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  relationshipStatus: text('relationship_status').default('single').notNull(), // 'single' | 'coupled'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// 2. PROFILES
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  age: integer('age').notNull(),
  birthdate: date('birthdate'),
  gender: text('gender'),
  city: text('city'),
  bio: text('bio'),
  lookingFor: text('looking_for'), // 'Long-term relationship', 'Marriage someday', etc.
  vouchRating: integer('vouch_rating').default(100),
  datingResumePublic: boolean('dating_resume_public').default(true),
  discoveryActive: boolean('discovery_active').default(true).notNull(),
  isVerified: boolean('is_verified').default(true),
  livenessVerified: boolean('liveness_verified').default(false).notNull(),
  verificationPhotoUrl: text('verification_photo_url'),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// 3. USER PHOTOS (3x2 Grid)
export const userPhotos = pgTable('user_photos', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// 4. USER INTERESTS
export const userInterests = pgTable('user_interests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  interest: text('interest').notNull(),
})

// 5. SWIPES (Single Mode)
export const swipes = pgTable('swipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  swiperId: uuid('swiper_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  targetId: uuid('target_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  direction: text('direction').notNull(), // 'like' | 'pass' | 'super_like'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// 6. MATCHES
export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  user1Id: uuid('user1_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  user2Id: uuid('user2_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  matchedAt: timestamp('matched_at', { withTimezone: true }).defaultNow().notNull(),
})

// 7. CONVERSATIONS
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').default('single_match').notNull(), // 'single_match' | 'couple'
  matchId: uuid('match_id').references(() => matches.id, { onDelete: 'cascade' }),
  relationshipId: uuid('relationship_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// 8. MESSAGES
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  text: text('text').notNull(),
  mediaUrl: text('media_url'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// 9. RELATIONSHIP INVITES / VOW PROPOSALS
export const relationshipInvites = pgTable('relationship_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  receiverId: uuid('receiver_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'accepted' | 'rejected'
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
})

// 10. RELATIONSHIPS (Commitment Lock)
export const relationships = pgTable('relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  partner1Id: uuid('partner1_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
  partner2Id: uuid('partner2_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
  status: text('status').default('active').notNull(), // 'active' | 'terminated'
  anniversaryDate: date('anniversary_date'),
  harmonyScore: integer('harmony_score').default(87).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  terminatedAt: timestamp('terminated_at', { withTimezone: true }),
})

// 11. DAILY CHECKINS (Double-Blind Partner Ratings)
export const dailyCheckins = pgTable('daily_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  relationshipId: uuid('relationship_id').references(() => relationships.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  partnerId: uuid('partner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  moodScore: integer('mood_score').notNull(), // 1 to 5
  promptQuestion: text('prompt_question'),
  promptAnswer: text('prompt_answer'),
  checkinDate: date('checkin_date').notNull(),
  isSealed: boolean('is_sealed').default(true).notNull(), // unsealed once both partners submit
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// 12. SHARED GOALS (Vows & Future Plans)
export const sharedGoals = pgTable('shared_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  relationshipId: uuid('relationship_id').references(() => relationships.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  targetDate: date('target_date'),
  isCompleted: boolean('is_completed').default(false).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// 13. TIMELINE MILESTONES (Couple Memory Book)
export const timelineMilestones = pgTable('timeline_milestones', {
  id: uuid('id').primaryKey().defaultRandom(),
  relationshipId: uuid('relationship_id').references(() => relationships.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  eventDate: date('event_date').notNull(),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// 14. USER BLOCKS (Safety & Privacy)
export const userBlocks = pgTable('user_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockerId: uuid('blocker_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  blockedId: uuid('blocked_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// 15. USER REPORTS (Trust & Safety Flags)
export const userReports = pgTable('user_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reportedId: uuid('reported_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reason: text('reason').default('Safety concern').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// RELATIONS DEFINITIONS
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  photos: many(userPhotos),
  interests: many(userInterests),
  sentInvites: many(relationshipInvites, { relationName: 'sentInvites' }),
  receivedInvites: many(relationshipInvites, { relationName: 'receivedInvites' }),
}))

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}))

export const userPhotosRelations = relations(userPhotos, ({ one }) => ({
  user: one(users, {
    fields: [userPhotos.userId],
    references: [users.id],
  }),
}))

export const userInterestsRelations = relations(userInterests, ({ one }) => ({
  user: one(users, {
    fields: [userInterests.userId],
    references: [users.id],
  }),
}))

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}))

export const relationshipsRelations = relations(relationships, ({ one, many }) => ({
  partner1: one(users, {
    fields: [relationships.partner1Id],
    references: [users.id],
    relationName: 'partner1',
  }),
  partner2: one(users, {
    fields: [relationships.partner2Id],
    references: [users.id],
    relationName: 'partner2',
  }),
  checkins: many(dailyCheckins),
  goals: many(sharedGoals),
  milestones: many(timelineMilestones),
}))

export const dailyCheckinsRelations = relations(dailyCheckins, ({ one }) => ({
  relationship: one(relationships, {
    fields: [dailyCheckins.relationshipId],
    references: [relationships.id],
  }),
  user: one(users, {
    fields: [dailyCheckins.userId],
    references: [users.id],
  }),
}))

export const sharedGoalsRelations = relations(sharedGoals, ({ one }) => ({
  relationship: one(relationships, {
    fields: [sharedGoals.relationshipId],
    references: [relationships.id],
  }),
}))

export const timelineMilestonesRelations = relations(timelineMilestones, ({ one }) => ({
  relationship: one(relationships, {
    fields: [timelineMilestones.relationshipId],
    references: [relationships.id],
  }),
}))
