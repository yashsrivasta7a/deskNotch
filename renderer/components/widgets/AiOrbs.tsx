import React, { useState } from 'react'
import { motion } from 'motion/react'
import { RotateCw } from 'lucide-react'
import { Complication } from '../ui/complication'
import { Tile } from '../ui/tile'
import { type ProviderLimits, formatReset, refreshAiLimits } from '../../hooks/useAiLimits'

/** The notch's own accent — the pin dot's orange — for a limit nearly gone. */
export const WARNING = 'rgb(255, 95, 46)'

/** The window's length, short enough to sit under an orb. */
const SHORT: Record<string, string> = { SESSION: '5H', WEEK: '7D', MONTH: '30D' }

/** A stable key per limit, for the show/hide setting: "Claude-SESSION". */
export const limitKey = (provider: string, label?: string) => (label ? `${provider}-${label}` : provider)

/** Every limit the user can switch on or off, with a short name for each. */
export const limitChoices = (providers: ProviderLimits[] | null) =>
  (providers ?? []).flatMap((p) =>
    'limits' in p
      ? p.limits.map((l) => ({ key: limitKey(p.name, l.label), name: `${p.name} ${SHORT[l.label] ?? l.label}` }))
      : [{ key: limitKey(p.name), name: p.name }],
  )

/** The providers with hidden limits taken out, and emptied providers dropped. */
export const visibleLimits = (providers: ProviderLimits[] | null, hidden: string[] = []): ProviderLimits[] =>
  (providers ?? []).flatMap((p): ProviderLimits[] => {
    if (!('limits' in p)) return hidden.includes(limitKey(p.name)) ? [] : [p]
    const limits = p.limits.filter((l) => !hidden.includes(limitKey(p.name, l.label)))
    return limits.length ? [{ ...p, limits }] : []
  })

/**
 * A tool whose reading failed: its name, why, and a retry. The whole card is
 * the button, so it is easy to hit; the arrow turns while the check runs.
 */
const Retry: React.FC<{ name: string; error: 'expired' | 'unavailable' }> = ({ name, error }) => {
  const [busy, setBusy] = useState(false)
  const retry = () => {
    if (busy) return
    setBusy(true)
    // At least one full turn, so a fast answer still reads as "checked".
    void Promise.all([refreshAiLimits(), new Promise((r) => setTimeout(r, 700))]).finally(() => setBusy(false))
  }
  return (
    <Tile width={providerWidth({ name, error })} onClick={retry} label={`Check ${name} again`} className="group/retry">
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-white/[0.07] text-white/60 transition-colors group-hover/retry:bg-white/[0.12] group-hover/retry:text-white">
          <motion.span
            animate={{ rotate: busy ? 360 : 0 }}
            transition={busy ? { duration: 0.7, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
            className="grid"
          >
            <RotateCw size={14} strokeWidth={2.2} />
          </motion.span>
        </span>
        <span className="flex flex-col items-center gap-[3px] leading-none">
          <span className="text-[11px] font-medium text-white/70">{name}</span>
          <span className="text-[9.5px] text-white/35">{busy ? 'Checking…' : error === 'expired' ? 'Sign in again' : 'Tap to retry'}</span>
        </span>
      </div>
    </Tile>
  )
}

/** Card padding plus one column per orb: how wide a tool's card is. */
export const providerWidth = (provider: ProviderLimits) => 24 + ('limits' in provider ? provider.limits.length : 1) * 72

/**
 * AI plan limits: one card per tool, each of its windows a globe filled to
 * how much is used. `tint` is the notch's tint as "r, g, b".
 */
export const AiOrbs: React.FC<{ providers: ProviderLimits[] | null; tint: string }> = ({ providers, tint }) => (
  <>
    {(providers ?? []).map((provider) =>
      'error' in provider ? (
        <Retry key={provider.name} name={provider.name} error={provider.error} />
      ) : (
      <Tile key={provider.name} width={providerWidth(provider)} className="flex items-center justify-center">
        {provider.limits.map((limit) => {
            const used = Math.round(limit.used)
            return (
              <Complication
                key={limit.label}
                fill={used / 100}
                color={used >= 80 ? WARNING : `rgb(${tint})`}
                value={`${used}%`}
                // At rest, which window ("Claude 7d"); on hover, what is left and when it refills.
                label={`${provider.name} ${(SHORT[limit.label] ?? limit.label).toLowerCase()}`}
                hint={`${100 - used}% left${limit.resetsAt ? ` · ${formatReset(limit.resetsAt).replace('resets in ', '').split(' ')[0]}` : ''}`}
              />
            )
          })}
      </Tile>
      ),
    )}
  </>
)
