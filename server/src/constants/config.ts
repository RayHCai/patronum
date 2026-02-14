// Application Constants
// Centralized configuration values

/**
 * Number of AI agent participants in each conversation session
 * IMPORTANT: This is the ONLY place where this value should be defined
 */
export const NUM_AI_AGENTS = 2;

/**
 * Avatar colors pool for agents
 */
export const AGENT_COLORS = [
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#F59E0B', // amber
  '#3B82F6', // blue
  '#10B981', // green
  '#EF4444', // red
  '#6366F1', // indigo
  '#F97316', // orange
  '#06B6D4', // cyan
] as const;
