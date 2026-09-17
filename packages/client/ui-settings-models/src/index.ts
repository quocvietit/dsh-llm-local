/** Host loader entry for the browser implementation exported from `./client`. */

export { Config } from './config.ts'
export type { Config as ModelsPluginConfig } from './config.ts'

/** Host plugin body — no host-side behavior for the models settings plugin. */
export function apply(): void {}
