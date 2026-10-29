#!/usr/bin/env node
/**
 * Verify that the custom branch bundle patches correctly disable DeepSeek
 * built-in providers and feedback UI features.
 *
 * Usage:  node custom/verify-customizations.mjs
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')

function readPatch(relPath) {
  return readFileSync(join(root, relPath), 'utf8')
}

let passed = 0
let failed = 0

function check(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}`)
    failed++
  }
}

// ── web-app bundle patch ─────────────────────────────────────────────────────

console.log('\npackages/bundle/web-app/cordis.patch.yml')
const webApp = readPatch('packages/bundle/web-app/cordis.patch.yml')

// DeepSeek providers disabled
check('deepseek-llm-api-extensions disabled', /^- id: deepseek-llm-api-extensions\n\s+disabled: true/m.test(webApp))
check('llm-deepseek disabled', /^- id: llm-deepseek\n\s+disabled: true/m.test(webApp))
check('llm-deepseek-account disabled', /^- id: llm-deepseek-account\n\s+disabled: true/m.test(webApp))
check('deepseek-account disabled', /^- id: deepseek-account\n\s+disabled: true/m.test(webApp))
check('web-search-deepseek disabled', /^- id: web-search-deepseek\n\s+disabled: true/m.test(webApp))

// Feedback features disabled
check('command-feedback disabled', /^- id: command-feedback\n\s+disabled: true/m.test(webApp))
check('message-feedback disabled', /^- id: message-feedback\n\s+disabled: true/m.test(webApp))
check('ui-message-feedback disabled', /^- id: ui-message-feedback\n\s+disabled: true/m.test(webApp))

// ── profile overlay ───────────────────────────────────────────────────────────

const profilePath = join(root, '../../data/profiles/web/cordis.patch.yml')
let profile
try {
  profile = readFileSync(profilePath, 'utf8')
  console.log('\ndata/profiles/web/cordis.patch.yml (dsh-docker)')
  check('llm-deepseek disabled in profile', /^- id: llm-deepseek\n\s+disabled: true/m.test(profile))
  check('ui-message-feedback disabled in profile', /^- id: ui-message-feedback\n\s+disabled: true/m.test(profile))
  check('command-feedback disabled in profile', /^- id: command-feedback\n\s+disabled: true/m.test(profile))
  check('message-feedback disabled in profile', /^- id: message-feedback\n\s+disabled: true/m.test(profile))
  check('message-feedback disabled in profile', /^- id: message-feedback\n\s+disabled: true/m.test(profile))
} catch {
  console.log('\n  (profile not found — run from within the dsh-docker checkout)')
}

// ── summary ───────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
