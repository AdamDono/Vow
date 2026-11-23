import { db } from '../db/client.js'
import { relationships } from '../db/schema/index.js'
import { eq, and, or, desc } from 'drizzle-orm'

export interface PlatformHistorySummary {
  completedRelationships: number
  longestCommitmentDays: number
  totalCommittedDays: number
  avgHarmonyScore: number | null
  badgeLabel: string
}

export async function getUserPlatformHistory(userId: string): Promise<PlatformHistorySummary> {
  const pastRelationships = await db.query.relationships.findMany({
    where: and(
      eq(relationships.status, 'terminated'),
      or(eq(relationships.partner1Id, userId), eq(relationships.partner2Id, userId))
    ),
    orderBy: [desc(relationships.terminatedAt)],
  })

  if (pastRelationships.length === 0) {
    return {
      completedRelationships: 0,
      longestCommitmentDays: 0,
      totalCommittedDays: 0,
      avgHarmonyScore: null,
      badgeLabel: 'Fresh Start on Vow',
    }
  }

  let longest = 0
  let totalDays = 0
  let totalHarmony = 0

  for (const rel of pastRelationships) {
    const start = rel.anniversaryDate ? new Date(rel.anniversaryDate) : new Date(rel.createdAt)
    const end = rel.terminatedAt ? new Date(rel.terminatedAt) : new Date()
    const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    if (days > longest) longest = days
    totalDays += days
    totalHarmony += rel.harmonyScore ?? 85
  }

  const avgHarmonyScore = Math.round(totalHarmony / pastRelationships.length)

  return {
    completedRelationships: pastRelationships.length,
    longestCommitmentDays: longest,
    totalCommittedDays: totalDays,
    avgHarmonyScore,
    badgeLabel:
      longest >= 90
        ? 'Verified Long-Term Track Record'
        : 'Verified Commitment History',
  }
}
