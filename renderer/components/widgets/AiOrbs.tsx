import React from 'react'
import { Complication } from '../ui/complication'
import { Tile } from '../ui/tile'
import { type ProviderLimits, formatReset } from '../../hooks/useAiLimits'

/** The notch's own accent — the pin dot's orange — for a limit nearly gone. */
export const WARNING = 'rgb(255, 95, 46)'

/** The window's length, short enough to sit under an orb. */
const SHORT: Record<string, string> = { SESSION: '5H', WEEK: '7D', MONTH: '30D' }

const ERRORS = {
  expired: 'login expired',
  unavailable: 'unavailable',
}

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

/** Card padding plus one column per orb: how wide a tool's card is. */
export const providerWidth = (provider: ProviderLimits) => 24 + ('limits' in provider ? provider.limits.length : 1) * 72

/**
 * AI plan limits: one card per tool, each of its windows a globe filled to
 * how much is used. `tint` is the notch's tint as "r, g, b".
 */
export const AiOrbs: React.FC<{ providers: ProviderLimits[] | null; tint: string }> = ({ providers, tint }) => (
  <>
    {(providers ?? []).map((provider) => (
      <Tile key={provider.name} width={providerWidth(provider)} className="flex items-center justify-center">
        {'limits' in provider ? (
          provider.limits.map((limit) => {
            const used = Math.round(limit.used)
            return (
              <Complication
                key={limit.label}
                fill={used / 100}
                color={used >= 80 ? WARNING : `rgb(${tint})`}
                value={`${used}%`}
                label={`${provider.name} · ${SHORT[limit.label] ?? limit.label}`}
                hint={formatReset(limit.resetsAt) || `${100 - used}% left`}
              />
            )
          })
        ) : (
          <Complication fill={0} color={`rgb(${tint})`} value="—" label={provider.name} hint={ERRORS[provider.error]} idle />
        )}
      </Tile>
    ))}
  </>
)
