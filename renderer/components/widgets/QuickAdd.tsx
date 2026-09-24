import React, { useState } from 'react'
import type { TaskStore } from '../../hooks/useTasks'

/**
 * A task typed straight into a glance card. Enter adds it, Escape or clicking
 * away closes it, so the card is never left in an editing state.
 */
export const QuickAdd: React.FC<{ tasks: TaskStore; onDone: () => void; className?: string }> = ({
  tasks,
  onDone,
  className = '',
}) => {
  const [draft, setDraft] = useState('')

  return (
    <input
      autoFocus
      value={draft}
      maxLength={200}
      placeholder="Add a task"
      onChange={(event) => setDraft(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onBlur={onDone}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          tasks.add(draft)
          onDone()
        }
        if (event.key === 'Escape') onDone()
      }}
      className={`w-full min-w-0 bg-transparent text-[13px] font-medium leading-tight text-white outline-none placeholder:text-white/30 ${className}`}
    />
  )
}
