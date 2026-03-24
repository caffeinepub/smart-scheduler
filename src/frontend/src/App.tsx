import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  ListTodo,
  Plus,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  ConflictPair,
  DayLoad,
  Event as ScheduleEvent,
  Task,
} from "./backend.d";
import { EventModal } from "./components/EventModal";
import { TaskModal } from "./components/TaskModal";
import { useActor } from "./hooks/useActor";

// ──────────────────────────────────────────────
// Date Helpers
// ──────────────────────────────────────────────
function getWeekStart(offset = 0): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ──────────────────────────────────────────────
// Color Helpers
// ──────────────────────────────────────────────
const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  Meeting: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  Work: { bg: "bg-indigo-100", text: "text-indigo-700", dot: "bg-indigo-500" },
  Health: {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  Personal: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
};

const CATEGORY_EVENT_BG: Record<string, string> = {
  Meeting: "bg-blue-500",
  Work: "bg-indigo-500",
  Health: "bg-emerald-500",
  Personal: "bg-purple-500",
};

function getCategoryColor(cat: string) {
  return (
    CATEGORY_COLORS[cat] ?? {
      bg: "bg-gray-100",
      text: "text-gray-700",
      dot: "bg-gray-400",
    }
  );
}

function getCategoryEventBg(cat: string): string {
  return CATEGORY_EVENT_BG[cat] ?? "bg-gray-500";
}

function getPriorityClass(p: string): string {
  if (p === "high") return "bg-red-100 text-red-700 border-red-200";
  if (p === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function getStatusClass(s: string): string {
  if (s === "in-progress") return "bg-blue-100 text-blue-700";
  if (s === "done") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-600";
}

function getLoadColor(score: number): string {
  if (score > 8) return "bg-red-500";
  if (score > 4) return "bg-amber-400";
  return "bg-emerald-400";
}

function getLoadLabel(score: number): string {
  if (score > 8) return "Heavy";
  if (score > 4) return "Moderate";
  return "Light";
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityClass(priority)}`}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label =
    status === "in-progress"
      ? "In Progress"
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(status)}`}
    >
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────
// Tasks Panel
// ──────────────────────────────────────────────
interface TasksPanelProps {
  tasks: Task[];
  isLoading: boolean;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
}

function TasksPanel({
  tasks,
  isLoading,
  onAddTask,
  onEditTask,
  onToggleStatus,
}: TasksPanelProps) {
  const groups: { label: string; status: string; items: Task[] }[] = [
    {
      label: "Pending",
      status: "pending",
      items: tasks.filter((t) => t.status === "pending"),
    },
    {
      label: "In Progress",
      status: "in-progress",
      items: tasks.filter((t) => t.status === "in-progress"),
    },
    {
      label: "Done",
      status: "done",
      items: tasks.filter((t) => t.status === "done"),
    },
  ];

  const groupAccentClass: Record<string, string> = {
    pending: "border-l-amber-400",
    "in-progress": "border-l-blue-400",
    done: "border-l-emerald-400",
  };

  const groupHeaderClass: Record<string, string> = {
    pending: "text-amber-700 bg-amber-50",
    "in-progress": "text-blue-700 bg-blue-50",
    done: "text-emerald-700 bg-emerald-50",
  };

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      data-ocid="tasks.panel"
    >
      {/* Tasks Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div>
          <h2 className="text-lg font-bold text-foreground">All Tasks</h2>
          <p className="text-sm text-muted-foreground">
            {tasks.length} total ·{" "}
            {tasks.filter((t) => t.status !== "done").length} active
          </p>
        </div>
        <Button
          onClick={onAddTask}
          className="rounded-full px-5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold h-9"
          data-ocid="tasks.add_button"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add Task
        </Button>
      </div>

      {/* Task Groups */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-3" data-ocid="tasks.loading_state">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-64 text-center"
            data-ocid="tasks.empty_state"
          >
            <ListTodo className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No tasks yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Add your first task to get started
            </p>
            <Button
              onClick={onAddTask}
              className="mt-4 rounded-full px-5"
              data-ocid="tasks.add_button"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add Task
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.status}>
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${groupHeaderClass[group.status]}`}
                  >
                    {group.label}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {group.items.length}{" "}
                    {group.items.length === 1 ? "task" : "tasks"}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {group.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 italic pl-2">
                    No tasks in this group
                  </p>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {group.items
                        .slice()
                        .sort((a, b) => Number(a.dueDate) - Number(b.dueDate))
                        .map((task, idx) => (
                          <motion.div
                            key={String(task.id)}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`flex items-center gap-4 p-4 rounded-xl bg-card border border-border border-l-4 ${groupAccentClass[group.status]} hover:shadow-sm transition-shadow`}
                            data-ocid={`tasks.item.${idx + 1}`}
                          >
                            {/* Main info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p
                                  className={`font-semibold text-sm ${
                                    task.status === "done"
                                      ? "line-through text-muted-foreground"
                                      : "text-foreground"
                                  }`}
                                >
                                  {task.title}
                                </p>
                                <PriorityBadge priority={task.priority} />
                              </div>
                              {task.description && (
                                <p className="text-xs text-muted-foreground truncate mb-1.5">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="w-3 h-3" />
                                  Due{" "}
                                  {new Date(
                                    Number(task.dueDate),
                                  ).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {task.estimatedHours}h est.
                                </span>
                              </div>
                            </div>

                            {/* Status + Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => onToggleStatus(task)}
                                title="Cycle status"
                                className="cursor-pointer hover:scale-105 transition-transform"
                                data-ocid={`tasks.toggle.${idx + 1}`}
                              >
                                <StatusBadge status={task.status} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditTask(task)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="Edit task"
                                data-ocid={`tasks.edit_button.${idx + 1}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// App
// ──────────────────────────────────────────────
export default function App() {
  const { actor: rawActor, isFetching: actorLoading } = useActor();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actor = rawActor as any;
  const queryClient = useQueryClient();

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = getWeekStart(weekOffset);
  const weekEnd = addDays(weekStart, 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // View toggle
  const [view, setView] = useState<"calendar" | "tasks">("calendar");

  // Modal state
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date | null>(null);

  const seededRef = useRef(false);

  const enabled = !!actor && !actorLoading;

  const eventsQuery = useQuery<ScheduleEvent[]>({
    queryKey: ["events"],
    queryFn: () => actor.getEvents(),
    enabled,
  });

  const tasksQuery = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => actor.getTasks(),
    enabled,
  });

  const conflictsQuery = useQuery<ConflictPair[]>({
    queryKey: ["conflicts"],
    queryFn: () => actor.getConflicts(),
    enabled,
  });

  const workloadQuery = useQuery<DayLoad[]>({
    queryKey: ["workload", weekStart.getTime()],
    queryFn: () =>
      actor.getWorkloadByDay(
        BigInt(weekStart.getTime()),
        BigInt(weekEnd.getTime()),
      ),
    enabled,
  });

  const events: ScheduleEvent[] = eventsQuery.data ?? [];
  const tasks: Task[] = tasksQuery.data ?? [];
  const conflicts: ConflictPair[] = conflictsQuery.data ?? [];
  const workload: DayLoad[] = workloadQuery.data ?? [];
  const isLoading =
    actorLoading || eventsQuery.isLoading || tasksQuery.isLoading;

  // Seed on empty
  useEffect(() => {
    if (
      !actorLoading &&
      !eventsQuery.isLoading &&
      actor &&
      events.length === 0 &&
      !seededRef.current
    ) {
      seededRef.current = true;
      actor.seedData().then(() => {
        queryClient.invalidateQueries();
      });
    }
  }, [actorLoading, eventsQuery.isLoading, actor, events.length, queryClient]);

  function refetchAll() {
    queryClient.invalidateQueries();
  }

  // ── Event handlers ──
  async function handleAddEvent(data: {
    title: string;
    description: string;
    startTime: bigint;
    endTime: bigint;
    category: string;
    priority: string;
  }) {
    await actor.createEvent(
      data.title,
      data.description,
      data.startTime,
      data.endTime,
      data.category,
      data.priority,
    );
    toast.success("Event created");
    refetchAll();
  }

  async function handleEditEvent(data: {
    title: string;
    description: string;
    startTime: bigint;
    endTime: bigint;
    category: string;
    priority: string;
  }) {
    if (!editingEvent) return;
    await actor.updateEvent(
      editingEvent.id,
      data.title,
      data.description,
      data.startTime,
      data.endTime,
      data.category,
      data.priority,
    );
    toast.success("Event updated");
    refetchAll();
  }

  async function handleDeleteEvent() {
    if (!editingEvent) return;
    await actor.deleteEvent(editingEvent.id);
    toast.success("Event deleted");
    refetchAll();
  }

  async function handleAddTask(data: {
    title: string;
    description: string;
    dueDate: bigint;
    estimatedHours: number;
    priority: string;
  }) {
    await actor.createTask(
      data.title,
      data.description,
      data.dueDate,
      data.estimatedHours,
      data.priority,
    );
    toast.success("Task created");
    refetchAll();
  }

  async function handleEditTask(data: {
    title: string;
    description: string;
    dueDate: bigint;
    estimatedHours: number;
    priority: string;
    status?: string;
  }) {
    if (!editingTask) return;
    await actor.updateTask(
      editingTask.id,
      data.title,
      data.description,
      data.dueDate,
      data.estimatedHours,
      data.priority,
      data.status ?? editingTask.status,
    );
    toast.success("Task updated");
    refetchAll();
  }

  async function handleDeleteTask() {
    if (!editingTask) return;
    await actor.deleteTask(editingTask.id);
    toast.success("Task deleted");
    refetchAll();
  }

  async function toggleTaskStatus(task: Task) {
    const next =
      task.status === "pending"
        ? "in-progress"
        : task.status === "in-progress"
          ? "done"
          : "pending";
    await actor.updateTask(
      task.id,
      task.title,
      task.description,
      task.dueDate,
      task.estimatedHours,
      task.priority,
      next,
    );
    refetchAll();
  }

  // ── Sidebar data ──
  const upcomingEvents = [...events]
    .filter((e) => Number(e.startTime) >= Date.now())
    .sort((a, b) => Number(a.startTime) - Number(b.startTime))
    .slice(0, 5);

  const activeTasks = [...tasks]
    .filter((t) => t.status !== "done")
    .sort((a, b) => Number(a.dueDate) - Number(b.dueDate));

  const now = new Date();
  const weekStartForCount = getWeekStart(0);
  const weekEndForCount = addDays(weekStartForCount, 7);
  const eventsThisWeek = events.filter((e) => {
    const s = Number(e.startTime);
    return s >= weekStartForCount.getTime() && s < weekEndForCount.getTime();
  }).length;

  // ── Calendar helpers ──
  function getEventsForDay(day: Date): ScheduleEvent[] {
    return events
      .filter((e) => isSameDay(new Date(Number(e.startTime)), day))
      .sort((a, b) => Number(a.startTime) - Number(b.startTime));
  }

  function getWorkloadForDay(day: Date): DayLoad | undefined {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    return workload.find((w) => w.date === dateStr);
  }

  const isToday = (day: Date) => isSameDay(day, now);

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Toaster richColors position="top-right" />

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-50 h-16 flex items-center justify-between px-6 shadow-md"
        style={{ backgroundColor: "oklch(var(--navy))" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            Smart Scheduler
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setModalDefaultDate(null);
              setShowAddEvent(true);
            }}
            className="rounded-full px-5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold h-9"
            data-ocid="header.add_event_button"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Event
          </Button>
          <Button
            onClick={() => {
              setModalDefaultDate(null);
              setShowAddTask(true);
            }}
            variant="outline"
            className="rounded-full px-5 text-sm font-semibold h-9 border-white/30 text-white bg-white/10 hover:bg-white/20"
            data-ocid="header.add_task_button"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Task
          </Button>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside
          className="w-72 flex-shrink-0 bg-card border-r border-border overflow-y-auto"
          data-ocid="sidebar.panel"
        >
          <div className="p-5 space-y-6">
            {/* Today */}
            <div
              className="rounded-xl p-4 text-white"
              style={{ backgroundColor: "oklch(var(--navy))" }}
            >
              <p className="text-white/60 text-xs uppercase tracking-wider font-semibold mb-1">
                Today
              </p>
              <p className="text-2xl font-bold">
                {now.toLocaleDateString([], { weekday: "long" })}
              </p>
              <p className="text-white/80 text-sm">
                {now.toLocaleDateString([], {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <div className="mt-3 flex gap-4">
                <div className="text-center">
                  <p className="text-xl font-bold">{activeTasks.length}</p>
                  <p className="text-white/60 text-xs">Pending</p>
                </div>
                <div className="w-px bg-white/20" />
                <div className="text-center">
                  <p className="text-xl font-bold">{eventsThisWeek}</p>
                  <p className="text-white/60 text-xs">This Week</p>
                </div>
              </div>
            </div>

            {/* Upcoming Events */}
            <div data-ocid="upcoming.section">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">
                  Upcoming Events
                </h3>
              </div>
              {isLoading ? (
                <div className="space-y-2" data-ocid="upcoming.loading_state">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div
                  className="text-sm text-muted-foreground text-center py-4 rounded-lg bg-muted/50"
                  data-ocid="upcoming.empty_state"
                >
                  No upcoming events
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((ev, idx) => {
                    const cc = getCategoryColor(ev.category);
                    return (
                      <motion.button
                        key={String(ev.id)}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        onClick={() => setEditingEvent(ev)}
                        data-ocid={`upcoming.item.${idx + 1}`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${cc.dot}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {ev.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatTime(Number(ev.startTime))} ·{" "}
                              {formatShortDate(new Date(Number(ev.startTime)))}
                            </p>
                            <span
                              className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full ${cc.bg} ${cc.text}`}
                            >
                              {ev.category}
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tasks */}
            <div data-ocid="tasks.section">
              <div className="flex items-center gap-2 mb-3">
                <ListTodo className="w-4 h-4 text-teal" />
                <h3 className="font-semibold text-sm text-foreground">
                  Active Tasks
                </h3>
              </div>
              {isLoading ? (
                <div className="space-y-2" data-ocid="tasks.loading_state">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : activeTasks.length === 0 ? (
                <div
                  className="text-sm text-muted-foreground text-center py-4 rounded-lg bg-muted/50"
                  data-ocid="tasks.empty_state"
                >
                  No active tasks
                </div>
              ) : (
                <div className="space-y-2">
                  {activeTasks.slice(0, 6).map((task, idx) => (
                    <motion.div
                      key={String(task.id)}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      data-ocid={`tasks.item.${idx + 1}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          className="flex-1 text-left min-w-0"
                          onClick={() => setEditingTask(task)}
                        >
                          <p className="text-sm font-medium truncate">
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due{" "}
                            {new Date(Number(task.dueDate)).toLocaleDateString(
                              [],
                              { month: "short", day: "numeric" },
                            )}
                          </p>
                        </button>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <PriorityBadge priority={task.priority} />
                          <button
                            type="button"
                            onClick={() => toggleTaskStatus(task)}
                            className="cursor-pointer"
                            data-ocid={`tasks.toggle.${idx + 1}`}
                          >
                            <StatusBadge status={task.status} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Conflict Alerts */}
            <div data-ocid="conflicts.section">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <h3 className="font-semibold text-sm text-foreground">
                  Conflict Alerts
                </h3>
              </div>
              {conflictsQuery.isLoading ? (
                <Skeleton
                  className="h-12 w-full rounded-lg"
                  data-ocid="conflicts.loading_state"
                />
              ) : conflicts.length === 0 ? (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm"
                  data-ocid="conflicts.success_state"
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  No conflicts detected
                </div>
              ) : (
                <div className="space-y-2">
                  {conflicts.map((c, idx) => (
                    <div
                      key={`${c.eventId1}-${c.eventId2}`}
                      className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200"
                      data-ocid={`conflicts.item.${idx + 1}`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">
                        <span className="font-semibold">{c.title1}</span>{" "}
                        overlaps with{" "}
                        <span className="font-semibold">{c.title2}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Workload Summary */}
            <div data-ocid="workload.section">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">
                  Workload
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xl font-bold text-foreground">
                    {activeTasks.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Tasks Pending</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xl font-bold text-foreground">
                    {eventsThisWeek}
                  </p>
                  <p className="text-xs text-muted-foreground">Events/Week</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* ── View Toggle Bar ── */}
          <div className="flex items-center gap-1 px-6 py-3 border-b border-border bg-card">
            <div
              className="flex items-center gap-1 p-1 rounded-lg bg-muted"
              data-ocid="view.tab"
            >
              <button
                type="button"
                onClick={() => setView("calendar")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  view === "calendar"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-ocid="view.calendar_tab"
              >
                <CalendarDays className="w-4 h-4" />
                Calendar
              </button>
              <button
                type="button"
                onClick={() => setView("tasks")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  view === "tasks"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-ocid="view.tasks_tab"
              >
                <ListTodo className="w-4 h-4" />
                Tasks
                {activeTasks.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {activeTasks.length}
                  </span>
                )}
              </button>
            </div>

            {/* Calendar nav — only visible in calendar view */}
            {view === "calendar" && (
              <>
                <div className="w-px h-6 bg-border mx-2" />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setWeekOffset((w) => w - 1)}
                  data-ocid="calendar.pagination_prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setWeekOffset((w) => w + 1)}
                  data-ocid="calendar.pagination_next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold text-foreground ml-1">
                  {formatShortDate(weekStart)} –{" "}
                  {formatShortDate(addDays(weekStart, 6))}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-sm ml-auto"
                  onClick={() => setWeekOffset(0)}
                  data-ocid="calendar.today_button"
                >
                  Today
                </Button>
              </>
            )}
          </div>

          <AnimatePresence mode="wait">
            {view === "tasks" ? (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <TasksPanel
                  tasks={tasks}
                  isLoading={isLoading}
                  onAddTask={() => {
                    setModalDefaultDate(null);
                    setShowAddTask(true);
                  }}
                  onEditTask={(task) => setEditingTask(task)}
                  onToggleStatus={toggleTaskStatus}
                />
              </motion.div>
            ) : (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
                className="flex-1 overflow-auto"
                data-ocid="calendar.section"
              >
                {/* Day Columns */}
                <div className="flex h-full min-h-[600px]">
                  {weekDays.map((day, dayIdx) => {
                    const dayEvents = getEventsForDay(day);
                    const dayLoad = getWorkloadForDay(day);
                    const today = isToday(day);

                    return (
                      <div
                        key={day.toISOString()}
                        className={`flex-1 min-w-0 flex flex-col border-r border-border last:border-r-0 ${
                          today ? "bg-blue-50/40" : "bg-card"
                        }`}
                        data-ocid={`calendar.item.${dayIdx + 1}`}
                      >
                        {/* Day Header */}
                        <div
                          className={`px-2 py-2.5 text-center border-b border-border ${
                            today ? "bg-primary" : "bg-card"
                          }`}
                        >
                          <p
                            className={`text-xs font-semibold uppercase tracking-wider ${
                              today
                                ? "text-primary-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {DAY_NAMES[dayIdx]}
                          </p>
                          <p
                            className={`text-lg font-bold leading-tight ${
                              today
                                ? "text-primary-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {day.getDate()}
                          </p>
                        </div>

                        {/* Events only */}
                        <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                          {isLoading ? (
                            <div className="space-y-1 pt-1">
                              <Skeleton className="h-10 w-full rounded" />
                              <Skeleton className="h-7 w-full rounded" />
                            </div>
                          ) : (
                            <>
                              <AnimatePresence>
                                {dayEvents.map((ev) => {
                                  const startMs = Number(ev.startTime);
                                  const endMs = Number(ev.endTime);
                                  const durationMins =
                                    (endMs - startMs) / 60000;
                                  const blockH = Math.max(
                                    32,
                                    Math.min(96, (durationMins / 60) * 40),
                                  );

                                  return (
                                    <motion.button
                                      key={String(ev.id)}
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      style={{ height: blockH }}
                                      className={`w-full text-left px-2 py-1 rounded-md text-white overflow-hidden flex-shrink-0 ${getCategoryEventBg(
                                        ev.category,
                                      )} hover:opacity-90 transition-opacity`}
                                      onClick={() => setEditingEvent(ev)}
                                      data-ocid="calendar.event_button"
                                    >
                                      <p className="text-xs font-semibold truncate leading-tight">
                                        {ev.title}
                                      </p>
                                      {blockH >= 44 && (
                                        <p className="text-xs opacity-80 truncate flex items-center gap-0.5 mt-0.5">
                                          <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                          {formatTime(startMs)}
                                        </p>
                                      )}
                                    </motion.button>
                                  );
                                })}
                              </AnimatePresence>

                              {dayEvents.length === 0 && (
                                <div
                                  className="pt-2 text-center"
                                  data-ocid="day.empty_state"
                                >
                                  <button
                                    type="button"
                                    className="w-full h-8 rounded-md border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                      setModalDefaultDate(day);
                                      setShowAddEvent(true);
                                    }}
                                    data-ocid="calendar.open_modal_button"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Add button + Load bar */}
                        <div className="flex-shrink-0 px-1.5 pb-2">
                          {dayEvents.length > 0 && (
                            <button
                              type="button"
                              className="w-full h-6 mb-1 rounded border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center text-muted-foreground hover:text-primary"
                              onClick={() => {
                                setModalDefaultDate(day);
                                setShowAddEvent(true);
                              }}
                              data-ocid="calendar.open_modal_button"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}

                          {/* Load bar */}
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">
                                Load
                              </span>
                              {dayLoad && (
                                <span
                                  className={`text-[10px] font-medium ${
                                    dayLoad.loadScore > 8
                                      ? "text-red-600"
                                      : dayLoad.loadScore > 4
                                        ? "text-amber-600"
                                        : "text-emerald-600"
                                  }`}
                                >
                                  {getLoadLabel(dayLoad.loadScore)}
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  dayLoad
                                    ? getLoadColor(dayLoad.loadScore)
                                    : "bg-muted"
                                }`}
                                style={{
                                  width: dayLoad
                                    ? `${Math.min(100, (dayLoad.loadScore / 12) * 100)}%`
                                    : "0%",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ── Footer ── */}
      <footer
        className="py-3 px-6 text-center text-xs"
        style={{ backgroundColor: "oklch(var(--navy))" }}
      >
        <span className="text-white/50">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 hover:text-white transition-colors"
          >
            caffeine.ai
          </a>
        </span>
      </footer>

      {/* ── Modals ── */}
      <EventModal
        open={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        onSave={handleAddEvent}
        defaultDate={modalDefaultDate}
      />

      <TaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        onSave={handleAddTask}
        defaultDate={modalDefaultDate}
      />

      {editingEvent && (
        <EventModal
          open={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={handleEditEvent}
          onDelete={handleDeleteEvent}
          event={editingEvent}
        />
      )}

      {editingTask && (
        <TaskModal
          open={!!editingTask}
          onClose={() => setEditingTask(null)}
          onSave={handleEditTask}
          onDelete={handleDeleteTask}
          task={editingTask}
        />
      )}
    </div>
  );
}
