/**
 * Plan limits for AI coding tools — the same percentages Claude Code's /usage
 * and Codex's /status show. Each is read with the login that tool already keeps
 * on disk; tokens never leave the main process except to their own provider.
 *
 * ponytail: no token refresh here — refreshing rotates the token the tool itself
 * relies on. The tool refreshes it next time it runs; the file is re-read each poll.
 */
import { ipcMain } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'

export interface Limit {
  label: string
  /** Percent of the limit used, 0–100. */
  used: number
  resetsAt: string | null
}

export type ProviderLimits =
  | { name: string; limits: Limit[] }
  | { name: string; error: 'expired' | 'unavailable' }

/** Names a window by its length, so every provider reads the same way. */
const windowLabel = (seconds: number) =>
  seconds <= 86400 ? 'SESSION' : seconds <= 7 * 86400 ? 'WEEK' : 'MONTH'

const clamp = (value: number) => Math.min(100, Math.max(0, value ?? 0))

const readJson = async (file: string) =>
  JSON.parse(await fs.promises.readFile(path.join(os.homedir(), file), 'utf8'))

/** Last good reading per tool. A failed or rate-limited check shows this
 *  instead of an error, and checks closer than MIN_GAP reuse it outright — the
 *  endpoints rate-limit, and Claude Code polls the same one. */
const lastGood = new Map<string, { at: number; value: ProviderLimits }>()
const MIN_GAP = 60_000

async function cached(name: string, read: () => Promise<ProviderLimits | null>) {
  const previous = lastGood.get(name)
  if (previous && Date.now() - previous.at < MIN_GAP) return previous.value
  const value = await read()
  if (value && 'limits' in value) {
    lastGood.set(name, { at: Date.now(), value })
    return value
  }
  // A signed-out tool (null) drops out; any other failure keeps the last reading.
  return value && previous ? previous.value : value
}

/** Fetches with the tool's token; null when that tool is not signed in. */
async function fetchLimits(
  name: string,
  request: () => Promise<Response | null>,
  parse: (body: any) => Limit[],
): Promise<ProviderLimits | null> {
  let response: Response | null
  try {
    response = await request()
  } catch {
    // A missing or unreadable credentials file means the tool is not in use.
    return null
  }
  if (!response) return null
  if (response.status === 401 || response.status === 403) return { name, error: 'expired' }
  if (!response.ok) return { name, error: 'unavailable' }
  try {
    return { name, limits: parse(await response.json()) }
  } catch {
    return { name, error: 'unavailable' }
  }
}

const claude = () =>
  cached('Claude', () => fetchLimits(
    'Claude',
    async () => {
      const oauth = (await readJson('.claude/.credentials.json')).claudeAiOauth
      if (!oauth?.accessToken) return null
      return fetch('https://api.anthropic.com/api/oauth/usage', {
        headers: {
          Authorization: `Bearer ${oauth.accessToken}`,
          'anthropic-beta': 'oauth-2025-04-20',
        },
      })
    },
    (body) =>
      [
        body.five_hour && { label: 'SESSION', used: clamp(body.five_hour.utilization), resetsAt: body.five_hour.resets_at },
        body.seven_day && { label: 'WEEK', used: clamp(body.seven_day.utilization), resetsAt: body.seven_day.resets_at },
      ].filter(Boolean) as Limit[],
  ))

const codex = () =>
  cached('Codex', () => fetchLimits(
    'Codex',
    async () => {
      const tokens = (await readJson('.codex/auth.json')).tokens
      if (!tokens?.access_token) return null
      return fetch('https://chatgpt.com/backend-api/wham/usage', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'chatgpt-account-id': tokens.account_id,
          'User-Agent': 'codex_cli_rs',
        },
      })
    },
    // Plans differ: Go has one 30-day window, Plus and Pro a 5-hour and a weekly one.
    (body) =>
      [body.rate_limit?.primary_window, body.rate_limit?.secondary_window]
        .filter(Boolean)
        .map((window: any) => ({
          label: windowLabel(window.limit_window_seconds),
          used: clamp(window.used_percent),
          resetsAt: window.reset_at ? new Date(window.reset_at * 1000).toISOString() : null,
        })),
  ))

export function registerLimitsIpc() {
  ipcMain.handle('ai:limits', async () =>
    (await Promise.all([claude(), codex()])).filter(Boolean) as ProviderLimits[],
  )
}
