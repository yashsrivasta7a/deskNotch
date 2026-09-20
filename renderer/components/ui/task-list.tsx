"use client";

import { useState } from "react";
import type { ComponentProps, CSSProperties } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { cn } from "../../lib/utils";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

const POP_SCALE = [1, 1.08, 1];
const FLICK = [0, 8, -2, 0];
const FLICK_TIMES = [0, 0.35, 0.7, 1];

const FILL: Transition = { duration: 0.24, ease: EASE_OUT };
const POP: Transition = { duration: 0.34, ease: EASE_OUT, times: [0, 0.4, 1] };
const TICK: Transition = { duration: 0.22, ease: EASE_OUT, delay: 0.06 };
const STRIKE: Transition = { duration: 0.38, ease: EASE_IN_OUT };
const NUDGE: Transition = { duration: 0.3, ease: EASE_OUT, times: FLICK_TIMES };
const REORDER: Transition = { type: "spring", stiffness: 320, damping: 30 };
const INSTANT: Transition = { duration: 0 };

// dashes divide the circumference, so the ring closes without a seam
const RING_R = 11;
const RING_DASH = `1 ${(2 * Math.PI * RING_R) / 13 - 1}`;

// the strike rides on the text itself, so a label that wraps gets a line per row
const STRIKE_STYLE: CSSProperties = {
  backgroundImage: "linear-gradient(currentColor, currentColor)",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "0 52%",
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
};

// the check is vertically aligned with the first line of text
const SIZES = {
  sm: {
    row: "gap-2 rounded-xl px-2.5 py-1.5",
    check: "h-4 w-4 shrink-0 mt-[1px]",
    text: "text-[12px] leading-[18px]",
    line: "1.5px",
    list: "gap-1.5",
  },
  md: {
    row: "gap-2.5 rounded-[12px] px-3 py-2",
    check: "h-5 w-5 shrink-0 mt-[1px]",
    text: "text-[13px] leading-[20px]",
    line: "2px",
    list: "gap-2",
  },
  lg: {
    row: "gap-3 rounded-2xl px-3.5 py-2.5",
    check: "h-6 w-6 shrink-0 mt-[1.5px]",
    text: "text-[15px] leading-[22px]",
    line: "2.5px",
    list: "gap-2.5",
  },
} as const;

export type TaskSize = keyof typeof SIZES;

// ticking runs tick to strike to nudge, unticking runs the same road backwards
const STAGE = {
  idle: "idle",
  tick: "tick",
  strike: "strike",
  nudge: "nudge",
  settled: "settled",
  unstrike: "unstrike",
  untick: "untick",
} as const;
type Stage = (typeof STAGE)[keyof typeof STAGE];

const FILLED: Stage[] = ["tick", "strike", "nudge", "settled", "unstrike"];
const STRUCK: Stage[] = ["strike", "nudge", "settled"];

const ACCENT_VAR = "--task-accent";
const TICK_VAR = "--task-tick";

// Relative luminance, so a light accent gets a dark tick and vice versa.
function tickColor(accent: string) {
  const hex = accent.replace("#", "");
  if (hex.length !== 3 && hex.length !== 6) return "white";

  const full =
    hex.length === 3
      ? hex.split("").map((char) => char + char).join("")
      : hex;

  const [r, g, b] = [0, 2, 4].map((offset) =>
    parseInt(full.slice(offset, offset + 2), 16),
  );

  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6 ? "#111" : "white";
}
const CARD =
  "bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] shadow-sm backdrop-blur-sm transition-all";
const FOCUS = `outline-none focus-visible:ring-1.5 focus-visible:ring-[var(${ACCENT_VAR})]/80 focus-visible:ring-offset-1 focus-visible:ring-offset-black`;

function useTiming() {
  const reduced = useReducedMotion() ?? false;
  return (transition: Transition) => (reduced ? INSTANT : transition);
}

function TaskCheck({
  filled,
  size,
  onDrawn,
}: {
  filled: boolean;
  size: TaskSize;
  onDrawn: () => void;
}) {
  const timing = useTiming();

  return (
    <motion.svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        "shrink-0 block text-neutral-300 dark:text-neutral-500",
        SIZES[size].check,
      )}
      initial={false}
      animate={{ scale: filled ? POP_SCALE : 1 }}
      transition={filled ? timing(POP) : INSTANT}
    >
      <motion.circle
        cx="12"
        cy="12"
        r={RING_R}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={RING_DASH}
        initial={false}
        animate={{ opacity: filled ? 0 : 1 }}
        transition={timing(FILL)}
      />
      <motion.circle
        cx="12"
        cy="12"
        r="12"
        fill={`var(${ACCENT_VAR})`}
        style={{ transformBox: "view-box", transformOrigin: "12px 12px" }}
        initial={false}
        animate={{ scale: filled ? 1 : 0 }}
        transition={timing(FILL)}
      />
      <motion.path
        d="M7.4 12.4 10.6 15.5 16.6 8.9"
        fill="none"
        stroke={`var(${TICK_VAR})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ pathLength: filled ? 1 : 0, opacity: filled ? 1 : 0 }}
        transition={timing(TICK)}
        onAnimationComplete={onDrawn}
      />
    </motion.svg>
  );
}

function TaskLabel({
  label,
  struck,
  size,
  onStruck,
}: {
  label: string;
  struck: boolean;
  size: TaskSize;
  onStruck: () => void;
}) {
  const timing = useTiming();
  const { text, line } = SIZES[size];

  return (
    <span className={cn("min-w-0 flex-1 block text-left", text)} title={label}>
      <motion.span
        style={STRIKE_STYLE}
        className={cn(
          "inline font-medium tracking-[-0.01em] transition-colors duration-300 break-words [overflow-wrap:anywhere] whitespace-normal",
          struck
            ? "text-white/35"
            : "text-white/90",
        )}
        initial={false}
        animate={{ backgroundSize: `${struck ? 100 : 0}% ${line}` }}
        transition={timing(STRIKE)}
        onAnimationComplete={onStruck}
      >
        {label}
      </motion.span>
    </span>
  );
}

export type TaskItemProps = Omit<
  ComponentProps<"div">,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
> & {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  size?: TaskSize;
  accent?: string;
  onCheckedChange?: (checked: boolean) => void;
  onDelete?: () => void;
  onSettled?: () => void;
  onReverted?: () => void;
};

export function TaskItem({
  label,
  checked,
  defaultChecked = false,
  size = "md",
  accent = "#FF5F2E",
  onCheckedChange,
  onDelete,
  onSettled,
  onReverted,
  className,
  onClick,
  style,
  ...props
}: TaskItemProps) {
  const timing = useTiming();
  const [own, setOwn] = useState(defaultChecked);
  const done = checked ?? own;

  const [stage, setStage] = useState<Stage>(done ? STAGE.settled : STAGE.idle);
  const [was, setWas] = useState(done);

  // turn around in the same render the tick flips, so the row never paints stale
  if (was !== done) {
    setWas(done);
    setStage(done ? STAGE.tick : STAGE.unstrike);
  }

  const onDrawn = () => {
    if (stage === STAGE.tick) setStage(STAGE.strike);
    if (stage === STAGE.untick) {
      setStage(STAGE.idle);
      onReverted?.();
    }
  };

  const onStruck = () => {
    if (stage === STAGE.strike) setStage(STAGE.nudge);
    if (stage === STAGE.unstrike) setStage(STAGE.untick);
  };

  const onFlicked = () => {
    if (stage !== STAGE.nudge) return;
    setStage(STAGE.settled);
    onSettled?.();
  };

  const toggle = () => {
    if (checked === undefined) setOwn(!done);
    onCheckedChange?.(!done);
  };

  return (
    <motion.div
      role="checkbox"
      aria-checked={done}
      tabIndex={0}
      data-slot="task-item"
      data-state={done ? "checked" : "unchecked"}
      style={
        {
          [ACCENT_VAR]: accent,
          [TICK_VAR]: tickColor(accent),
          ...style,
        } as CSSProperties
      }
      onClick={(event) => {
        onClick?.(event as any);
        toggle();
      }}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          toggle();
        }
      }}
      animate={{ x: stage === STAGE.nudge ? FLICK : 0 }}
      transition={stage === STAGE.nudge ? timing(NUDGE) : INSTANT}
      onAnimationComplete={onFlicked}
      className={cn(
        "group/task flex w-fit max-w-full cursor-pointer items-start text-left transition-[filter,box-shadow] duration-300 select-none",
        SIZES[size].row,
        CARD,
        FOCUS,
        className,
      )}
      {...props}
    >
      <TaskCheck
        filled={FILLED.includes(stage)}
        size={size}
        onDrawn={onDrawn}
      />
      <TaskLabel
        label={label}
        struck={STRUCK.includes(stage)}
        size={size}
        onStruck={onStruck}
      />
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete task"
          title="Delete task"
          className="opacity-0 group-hover/task:opacity-100 hover:text-red-400 text-white/30 p-0.5 rounded-md hover:bg-red-500/15 transition-all shrink-0 self-start mt-[1px] ml-1"
        >
          <svg viewBox="0 0 12 12" className="w-3 h-3 fill-none stroke-current stroke-[1.75]">
            <path d="M3 3l6 6M9 3l-6 6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </motion.div>
  );
}

export type Task = {
  id: string;
  label: string;
  done?: boolean;
};

export type TaskListProps = ComponentProps<"ul"> & {
  tasks?: Task[];
  defaultTasks?: Task[];
  size?: TaskSize;
  accent?: string;
  onTasksChange?: (tasks: Task[]) => void;
  onTaskDelete?: (id: string) => void;
};

export function TaskList({
  tasks,
  defaultTasks = [],
  size = "md",
  accent,
  onTasksChange,
  onTaskDelete,
  className,
  ...props
}: TaskListProps) {
  const timing = useTiming();
  const [own, setOwn] = useState(defaultTasks);
  const current = tasks ?? own;

  const [parked, setParked] = useState<string[]>(() =>
    (tasks ?? defaultTasks).filter((task) => task.done).map((task) => task.id),
  );
  const [announcement, setAnnouncement] = useState("");

  const toggle = (task: Task, done: boolean) => {
    const next = current.map((item) =>
      item.id === task.id ? { ...item, done } : item,
    );
    if (tasks === undefined) setOwn(next);
    onTasksChange?.(next);
    setAnnouncement(`${task.label} ${done ? "completed" : "reopened"}`);
  };

  // a parked row that is no longer done, or gone, was changed from outside
  const finished = parked
    .map((id) => current.find((task) => task.id === id))
    .filter((task): task is Task => task?.done === true);
  const open = current.filter((task) => !finished.includes(task));

  return (
    <ul
      data-slot="task-list"
      className={cn(
        "flex w-fit max-w-full flex-col items-start",
        SIZES[size].list,
        className,
      )}
      {...props}
    >
      {[...open, ...finished].map((task) => (
        <motion.li
          key={task.id}
          layout
          transition={timing(REORDER)}
          className="max-w-full"
        >
          <TaskItem
            label={task.label}
            checked={!!task.done}
            size={size}
            accent={accent}
            onCheckedChange={(done) => toggle(task, done)}
            onDelete={onTaskDelete ? () => onTaskDelete(task.id) : undefined}
            onSettled={() =>
              setParked((ids) =>
                ids.includes(task.id) ? ids : [...ids, task.id],
              )
            }
            onReverted={() =>
              setParked((ids) => ids.filter((id) => id !== task.id))
            }
          />
        </motion.li>
      ))}
      <li role="status" aria-live="polite" className="sr-only">
        {announcement}
      </li>
    </ul>
  );
}

export default TaskList;
