import React, { useState } from 'react'
import { motion } from 'motion/react'
import { TaskList } from '../ui/task-list'
import type { TaskStore } from '../../hooks/useTasks'

/** The notch's own accent, so both views read as one product. */
const ACCENT = '#FFFFFF'

interface TodoCardProps {
  store: TaskStore
}

export const TodoCard: React.FC<TodoCardProps> = ({ store }) => {
  const { tasks, setTasks, add: addTask, remove: removeTask } = store
  const [draft, setDraft] = useState('')

  const clearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.done))
  }

  const add = () => {
    if (draft.trim().length > 200) return
    addTask(draft)
    setDraft('')
  }
  const doneCount = tasks.filter((t) => t.done).length
  return (
    <div className="flex flex-col h-full glass rounded-card px-3.5 pt-3.5 pb-5 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
          <span className="text-[12px] font-semibold text-white/90 tracking-tight">Today's tasks</span>
        </div>
        <div className="flex items-center gap-1.5">
          {doneCount > 0 && (
            <motion.button
              type="button"
              onClick={clearCompleted}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="group/clear flex items-center gap-1 px-2 py-0.5 rounded-full
                         bg-white/[0.05] hover:bg-red-500/15 active:bg-red-500/25
                         border border-white/[0.08] hover:border-red-500/30
                         text-[10px] font-medium text-white/60 hover:text-red-400
                         transition-all shadow-sm cursor-pointer"
              title={`Clear ${doneCount} completed task${doneCount > 1 ? 's' : ''}`}
            >
              <svg
                viewBox="0 0 16 16"
                className="w-2.5 h-2.5 fill-none stroke-current stroke-[1.75] group-hover/clear:-rotate-12 transition-transform duration-200"
              >
                <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 011-1h3a1 1 0 011 1v1.5M6 7v5M10 7v5M3.5 4.5l.8 8.8a1.5 1.5 0 001.5 1.4h4.4a1.5 1.5 0 001.5-1.4l.8-8.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Clear ({doneCount})</span>
            </motion.button>
          )}
          <span className="tabular-nums text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/60">
            {doneCount} / {tasks.length}
          </span>
        </div>
      </div>

      <div className="relative mt-2.5 shrink-0 flex items-center">
        <input
          value={draft}
          maxLength={200}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="What needs doing?"
          className="w-full rounded-control glass-control
                     border border-white/[0.08] focus:border-white/30
                     pl-3 pr-14 py-1.5 text-[11px] text-white
                     placeholder:text-white/30 outline-none
                     transition-all duration-200"
        />
        {draft.trim() && (
          <div className="absolute right-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDraft('')}
              aria-label="Clear input text"
              title="Clear text"
              className="p-1 rounded-chip text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-colors"
            >
              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-none stroke-current stroke-[1.75]">
                <path d="M3 3l6 6M9 3l-6 6" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={add}
              aria-label="Add task"
              title="Add task (Enter)"
              className="p-1 rounded-chip bg-white text-black hover:bg-white/85 active:scale-95 transition-all shadow-[0_1px_6px_rgba(255,255,255,0.18)]"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 mt-2.5 overflow-y-auto min-h-0 pr-1">
        {tasks.length > 0 ? (
          <TaskList
            tasks={tasks}
            size="sm"
            accent={ACCENT}
            onTasksChange={setTasks}
            onTaskDelete={removeTask}
            className="!w-full [&>li]:w-full [&_[data-slot=task-item]]:w-full"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-4">
            <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.06] grid place-items-center mb-1.5">
              <svg className="w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-[11px] font-medium text-white/50">All caught up</div>
            <div className="text-[9.5px] text-white/30 mt-0.5">Add a task above to get started</div>
          </div>
        )}
      </div>
    </div>
  )
}
