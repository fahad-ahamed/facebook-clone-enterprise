/**
 * Ads System - Targeting Engine
 * Advanced user targeting based on demographics, interests, and behaviors
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Targeting types
interface TargetingRule {
  type: 'demographic' | 'interest' | 'behavior' | 'custom' | 'lookalike';
  operator: 'equals' | 'contains' | 'in' | 'not_in' | 'range' | 'exists';
  field: string;
  value: any;
  weight?: number;
}

interface UserTargetingProfile {
  userId: string;
  demographics: {
    age: number;
    gender: string;
    location: {
      country: string;
      region: string;
      city: string;
    };
    language: string;
    relationship: string;
    education: string;
    work: string[];
  };
  interests: Map<string, number>; // interest -> affinity score
  behaviors: Map<string, number>; // behavior -> frequency
  connections: {
    pages: string[];
    apps: string[];
    events: string[];
    groups: string[];
  };
  purchaseIntent: Map<string, number>; // category -> intent score
  customAudiences: string[];
}

// Interest taxonomy
const INTEREST_TAXONOMY = {
  'sports': ['football', 'basketball', 'cricket', 'tennis', 'swimming', 'fitness'],
  'technology': ['smartphones', 'laptops', 'gaming', 'programming', 'gadgets', 'ai'],
  'fashion': ['clothing', 'shoes', 'accessories', 'luxury', 'streetwear'],
  'food': ['cooking', 'restaurants', 'delivery', 'healthy eating', 'desserts'],
  'travel': ['flights', 'hotels', 'adventure', 'beach', 'mountains', 'road trips'],
  'entertainment': ['movies', 'music', 'tv shows', 'streaming', 'concerts'],
  'business': ['entrepreneurship', 'marketing', 'finance', 'investing', 'real estate'],
  'education': ['online courses', 'certifications', 'books', 'languages'],
};

/**
 * Build user targeting profile from multiple data sources
 */
export async function buildUserTargetingProfile(userId: string): Promise<UserTargetingProfile> {
  const [user, interests, behaviors, connections] = await Promise.all([
    fetchUserDemographics(userId),
    fetchUserInterests(userId),
    fetchUserBehaviors(userId),
    fetchUserConnections(userId),
  ]);

  return {
    userId,
    demographics: user,
    interests: new Map(Object.entries(interests)),
    behaviors: new Map(Object.entries(behaviors)),
    connections,
    purchaseIntent: await calculatePurchaseIntent(userId, interests, behaviors),
    customAudiences: await getUserCustomAudiences(userId),
  };
}

/**
 * Evaluate if user matches targeting criteria
 */
export async function evaluateTargeting(
  userId: string,
  targetingRules: TargetingRule[]
): Promise<{ matched: boolean; score: number; matchedRules: string[] }> {
  const profile = await buildUserTargetingProfile(userId);
  let totalScore = 0;
  const matchedRules: string[] = [];

  for (const rule of targetingRules) {
    const result = evaluateRule(profile, rule);
    if (result.matched) {
      matchedRules.push(rule.field);
      totalScore += result.score * (rule.weight || 1);
    }
  }

  return {
    matched: matchedRules.length > 0,
    score: totalScore / targetingRules.length,
    matchedRules,
  };
}

/**
 * Evaluate single targeting rule
 */
function evaluateRule(
  profile: UserTargetingProfile,
  rule: TargetingRule
): { matched: boolean; score: number } {
  switch (rule.type) {
    case 'demographic':
      return evaluateDemographic(profile, rule);
    case 'interest':
      return evaluateInterest(profile, rule);
    case 'behavior':
      return evaluateBehavior(profile, rule);
    case 'custom':
      return evaluateCustom(profile, rule);
    case 'lookalike':
      return evaluateLookalike(profile, rule);
    default:
      return { matched: false, score: 0 };
  }
}

/**
 * Evaluate demographic targeting
 */
function evaluateDemographic(
  profile: UserTargetingProfile,
  rule: TargetingRule
): { matched: boolean; score: number } {
  const { field, operator, value } = rule;
  let fieldValue: any;

  // Get field value from demographics
  if (field.startsWith('location.')) {
    const locationField = field.split('.')[1];
    fieldValue = profile.demographics.location[locationField as keyof typeof profile.demographics.location];
  } else {
    fieldValue = profile.demographics[field as keyof typeof profile.demographics];
  }

  // Evaluate based on operator
  switch (operator) {
    case 'equals':
      return { matched: fieldValue === value, score: fieldValue === value ? 1 : 0 };
    case 'in':
      return { matched: value.includes(fieldValue), score: value.includes(fieldValue) ? 1 : 0 };
    case 'range':
      const [min, max] = value;
      const inRange = fieldValue >= min && fieldValue <= max;
      return { matched: inRange, score: inRange ? 1 : 0 };
    default:
      return { matched: false, score: 0 };
  }
}

/**
 * Evaluate interest-based targeting
 */
function evaluateInterest(
  profile: UserTargetingProfile,
  rule: TargetingRule
): { matched: boolean; score: number } {
  const { field, operator, value } = rule;

  switch (operator) {
    case 'contains':
      // Check if user has interest in category
      const interestScore = profile.interests.get(value) || 0;
      return { matched: interestScore > 0, score: Math.min(1, interestScore / 100) };
    
    case 'in':
      // Check if user has any of the specified interests
      let maxScore = 0;
      for (const interest of value) {
        const score = profile.interests.get(interest) || 0;
        if (score > maxScore) maxScore = score;
      }
      return { matched: maxScore > 0, score: Math.min(1, maxScore / 100) };
    
    default:
      return { matched: false, score: 0 };
  }
}

/**
 * Evaluate behavior-based targeting
 */
function evaluateBehavior(
  profile: UserTargetingProfile,
  rule: TargetingRule
): { matched: boolean; score: number } {
  const { field, operator, value } = rule;

  switch (field) {
    case 'purchase_history':
      // Target users who purchased in category
      const purchaseScore = profile.purchaseIntent.get(value) || 0;
      return { matched: purchaseScore > 0, score: Math.min(1, purchaseScore / 100) };
    
    case 'page_admin':
      // Target users who manage pages
      return { matched: profile.connections.pages.length > 0, score: 1 };
    
    case 'engaged_shoppers':
      // Target users with high engagement with ads
      const behaviorScore = profile.behaviors.get('ad_engagement') || 0;
      return { matched: behaviorScore > 50, score: Math.min(1, behaviorScore / 100) };
    
    default:
      const behaviorValue = profile.behaviors.get(field) || 0;
      return { matched: behaviorValue > 0, score: Math.min(1, behaviorValue / 100) };
  }
}

/**
 * Evaluate custom audience targeting
 */
function evaluateCustom(
  profile: UserTargetingProfile,
  rule: TargetingRule
): { matched: boolean; score: number } {
  const { value } = rule;
  const isInAudience = profile.customAudiences.includes(value);
  return { matched: isInAudience, score: isInAudience ? 1 : 0 };
}

/**
 * Evaluate lookalike audience targeting
 */
function evaluateLookalike(
  profile: UserTargetingProfile,
  rule: TargetingRule
): { matched: boolean; score: number } {
  const { value, similarity = 0.01 } = rule;
  // Lookalike matching is done by similarity score stored in cache
  return { matched: true, score: similarity };
}

/**
 * Expand targeting to include related interests
 */
export function expandTargeting(interests: string[]): string[] {
  const expanded = new Set(interests);

  for (const interest of interests) {
    // Find parent category
    for (const [category, items] of Object.entries(INTEREST_TAXONOMY)) {
      if (items.includes(interest)) {
        expanded.add(category);
        // Add related interests from same category
        items.forEach(item => expanded.add(item));
      }
    }
  }

  return Array.from(expanded);
}

/**
 * Get targeting suggestions based on advertiser's business
 */
export async function getTargetingSuggestions(
  businessCategory: string,
  objective: string
): Promise<{ suggestions: any[]; estimatedReach: number }> {
  // Map business category to relevant targeting
  const categoryMapping: Record<string, string[]> = {
    'fashion_retail': ['fashion', 'shopping', 'clothing', 'luxury brands'],
    'technology': ['technology', 'gadgets', 'gaming', 'programming'],
    'food_beverage': ['food', 'restaurants', 'cooking', 'healthy eating'],
    'travel': ['travel', 'flights', 'hotels', 'adventure'],
    'fitness': ['sports', 'fitness', 'gym', 'healthy living'],
  };

  const suggestions = categoryMapping[businessCategory] || [];
  
  return {
    suggestions: suggestions.map(s => ({
      type: 'interest',
      value: s,
      estimatedReach: Math.floor(Math.random() * 1000000) + 100000,
    })),
    estimatedReach: Math.floor(Math.random() * 5000000) + 500000,
  };
}

// Helper functions

async function fetchUserDemographics(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      birthDate: true,
      gender: true,
      location: true,
      language: true,
      relationshipStatus: true,
      education: true,
      work: true,
    },
  });

  return {
    age: calculateAge(user?.birthDate),
    gender: user?.gender || 'unknown',
    location: parseLocation(user?.location),
    language: user?.language || 'en',
    relationship: user?.relationshipStatus || 'unknown',
    education: user?.education?.school || 'unknown',
    work: user?.work?.map(w => w.company) || [],
  };
}

async function fetchUserInterests(userId: string): Promise<Record<string, number>> {
  // Fetch from user interests table and page likes
  const interests = await prisma.userInterest.findMany({
    where: { userId },
    select: { interest: true, score: true },
  });

  return interests.reduce((acc, i) => {
    acc[i.interest] = i.score;
    return acc;
  }, {} as Record<string, number>);
}

async function fetchUserBehaviors(userId: string): Promise<Record<string, number>> {
  // Fetch from user behavior tracking
  const behaviors = await prisma.userBehavior.findMany({
    where: { userId },
    select: { behavior: true, frequency: true },
  });

  return behaviors.reduce((acc, b) => {
    acc[b.behavior] = b.frequency;
    return acc;
  }, {} as Record<string, number>);
}

async function fetchUserConnections(userId: string) {
  const [pages, groups, events] = await Promise.all([
    prisma.pageFollow.findMany({ where: { userId }, select: { pageId: true } }),
    prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } }),
    prisma.eventRsvp.findMany({ where: { userId }, select: { eventId: true } }),
  ]);

  return {
    pages: pages.map(p => p.pageId),
    apps: [],
    events: events.map(e => e.eventId),
    groups: groups.map(g => g.groupId),
  };
}

async function calculatePurchaseIntent(
  userId: string,
  interests: Record<string, number>,
  behaviors: Record<string, number>
): Promise<Map<string, number>> {
  const intent = new Map<string, number>();

  // Map interests to purchase intent
  const interestToPurchase = {
    'fashion': 'clothing',
    'technology': 'electronics',
    'travel': 'travel_services',
    'fitness': 'health_products',
  };

  for (const [interest, score] of Object.entries(interests)) {
    const purchaseCategory = interestToPurchase[interest];
    if (purchaseCategory) {
      intent.set(purchaseCategory, score * 0.7);
    }
  }

  // Consider purchase behaviors
  if (behaviors['online_shopper']) {
    // Boost all intents for online shoppers
    for (const [category, score] of intent) {
      intent.set(category, score * 1.3);
    }
  }

  return intent;
}

async function getUserCustomAudiences(userId: string): Promise<string[]> {
  const audiences = await prisma.customAudienceMember.findMany({
    where: { userId },
    select: { audienceId: true },
  });
  return audiences.map(a => a.audienceId);
}

function calculateAge(birthDate: Date | null): number {
  if (!birthDate) return 0;
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  return age;
}

function parseLocation(location: string | null) {
  if (!location) return { country: 'unknown', region: 'unknown', city: 'unknown' };
  const parts = location.split(', ');
  return {
    city: parts[0] || 'unknown',
    region: parts[1] || 'unknown',
    country: parts[2] || 'unknown',
  };
}

export default {
  buildUserTargetingProfile,
  evaluateTargeting,
  expandTargeting,
  getTargetingSuggestions,
};
