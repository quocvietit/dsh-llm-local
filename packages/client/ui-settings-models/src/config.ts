/**
 * Models settings plugin knobs. Deployment overlays these from cordis.patch.yml.
 */
import z from '@deepseek-ai/schemastery'

/** Plugin config: catalog "Add provider" is off unless a patch turns it on. */
export interface Config {
  /**
   * Show Settings → Models "Add provider" (shipped catalog routes).
   * Custom-provider add stays available either way.
   */
  catalogAdd?: boolean
}

/** Cordis schema for {@link Config}. */
export const Config: z<Config> = z.object({
  catalogAdd: z.boolean().default(false),
})
