/** Conversation preferences stored in the Host user-settings document. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owned by the conversation plugin. */
export const CONVERSATION_SETTINGS_NAMESPACE = 'ui-conversation'

/** Field carrying the delivery mode for a send gesture while an agent is busy. */
export const BUSY_ENTER_FIELD = 'busyEnter'

/** Busy-Enter behaviors accepted at settings and input boundaries. */
export const BUSY_ENTER_BEHAVIORS = ['queue', 'steer'] as const

/** Configurable meaning of a send gesture while the addressed agent is busy. */
export type BusyEnterBehavior = typeof BUSY_ENTER_BEHAVIORS[number]

/** Default preserves Enter-as-Queue for running conversations. */
export const DEFAULT_BUSY_ENTER_BEHAVIOR: BusyEnterBehavior = 'queue'

/** Field carrying whether unmodified Enter sends or inserts a newline. */
export const PLAIN_ENTER_FIELD = 'plainEnter'

/** Plain-Enter behaviors accepted at settings and input boundaries. */
export const PLAIN_ENTER_BEHAVIORS = ['newline', 'send'] as const

/** Configurable meaning of unmodified Enter in the composer. */
export type PlainEnterBehavior = typeof PLAIN_ENTER_BEHAVIORS[number]

/** Default: Enter inserts a newline; Ctrl/Alt+Enter sends. */
export const DEFAULT_PLAIN_ENTER_BEHAVIOR: PlainEnterBehavior = 'newline'

/** Durable conversation section shared by the Host schema and the browser scope. */
export interface ConversationSettings {
  /** Delivery mode for a send gesture while the addressed agent is busy. */
  busyEnter: BusyEnterBehavior
  /** Whether unmodified Enter sends a message or inserts a newline. */
  plainEnter: PlainEnterBehavior
}

/** Durable conversation schema; also the wire envelope the browser scope validates against. */
export const ConversationSettingsSchema: z<ConversationSettings> = z.object({
  [BUSY_ENTER_FIELD]: z.union([...BUSY_ENTER_BEHAVIORS]).default(DEFAULT_BUSY_ENTER_BEHAVIOR),
  [PLAIN_ENTER_FIELD]: z.union([...PLAIN_ENTER_BEHAVIORS]).default(DEFAULT_PLAIN_ENTER_BEHAVIOR),
})
