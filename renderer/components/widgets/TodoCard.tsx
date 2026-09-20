import React, { useEffect, useRef, useState } from 'react'
import { TaskList, type Task } from '../ui/task-list'

/** Matches the component's own default accent. */
const ACCENT = '#FF5F2E'

/** Backed by a JSON file in the main process, so tasks survive a restart. */
export const TodoCard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [draft, setDraft] = useState('')

  // Guards the save effect: without it the empty initial state would overwrite
  // the stored list before the load has come back.
  const loaded = useRef(false)

  useEffect(() => {
    window.ipc
      ?.invoke<Task[]>('store:get', 'todos')
      .then((stored) => setTasks(stored ?? []))
      .catch(() => setTasks([]))
      .finally(() => {
        loaded.current = true
      })
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    void window.ipc?.invoke('store:set', 'todos', tasks)
  }, [tasks])

  const add = () => {
    const label = draft.trim()
    if (!label) return
    setTasks((prev) => [...prev, { id: crypto.randomUUID(), label, done: false }])
    setDraft('')
  }

  const doneCount = tasks.filter((t) => t.done).length

  return (
    <div className="flex flex-col h-full rounded-2xl bg-neutral-100 dark:bg-[#161616] p-3 overflow-hidden">
      <div className="flex items-center justify-between shrink-0 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
        <span>Today's tasks</span>
        <span>
          {doneCount} / {tasks.length}
        </span>
      </div>

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        placeholder="What needs doing?"
        className="mt-2 shrink-0 w-full rounded-lg bg-white dark:bg-[#1F1F1F]
                   px-2.5 py-1.5 text-[11px] text-neutral-800 dark:text-neutral-100
                   placeholder:text-neutral-400 outline-none
                   focus-visible:ring-2 focus-visible:ring-[#FF5F2E]/60 transition-shadow"
      />

      <div className="flex-1 mt-2 overflow-y-auto min-h-0">
        {tasks.length > 0 ? (
          <TaskList
            tasks={tasks}
            size="sm"
            accent={ACCENT}
            onTasksChange={setTasks}
            className="w-full"
          />
        ) : (
          <div className="text-[10px] text-neutral-400 pt-1">Nothing yet.</div>
        )}
      </div>
    </div>
  )
}
