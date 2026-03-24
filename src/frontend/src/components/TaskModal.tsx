import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Task } from "../backend.d";

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    dueDate: bigint;
    estimatedHours: number;
    priority: string;
    status?: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  task?: Task | null;
  defaultDate?: Date | null;
}

export function TaskModal({
  open,
  onClose,
  onSave,
  onDelete,
  task,
  defaultDate,
}: TaskModalProps) {
  const isEdit = !!task;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("pending");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("1");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);
      setStatus(task.status);
      const d = new Date(Number(task.dueDate));
      setDueDate(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      );
      setEstimatedHours(String(task.estimatedHours));
    } else {
      const base = defaultDate ?? new Date();
      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus("pending");
      setDueDate(
        `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`,
      );
      setEstimatedHours("1");
    }
    setErrors({});
  }, [open, task, defaultDate]);

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Title is required";
    if (!dueDate) e.dueDate = "Due date is required";
    const hours = Number.parseFloat(estimatedHours);
    if (Number.isNaN(hours) || hours <= 0) e.estimatedHours = "Must be > 0";
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        dueDate: BigInt(new Date(`${dueDate}T12:00:00`).getTime()),
        estimatedHours: Number.parseFloat(estimatedHours),
        priority,
        ...(isEdit ? { status } : {}),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg"
        data-ocid={isEdit ? "task_edit.dialog" : "task_add.dialog"}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit Task" : "Add Task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              data-ocid="task.input"
            />
            {errors.title && (
              <p
                className="text-xs text-destructive"
                data-ocid="task_title.error_state"
              >
                {errors.title}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              data-ocid="task_desc.textarea"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-ocid="task_priority.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isEdit && (
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-ocid="task_status.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="task-due">Due Date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-ocid="task_due.input"
              />
              {errors.dueDate && (
                <p
                  className="text-xs text-destructive"
                  data-ocid="task_due.error_state"
                >
                  {errors.dueDate}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="task-hours">Est. Hours</Label>
              <Input
                id="task-hours"
                type="number"
                min="0.5"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                data-ocid="task_hours.input"
              />
              {errors.estimatedHours && (
                <p
                  className="text-xs text-destructive"
                  data-ocid="task_hours.error_state"
                >
                  {errors.estimatedHours}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {isEdit && onDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="mr-auto"
              data-ocid="task.delete_button"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving || deleting}
            data-ocid="task.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || deleting}
            className="bg-primary text-primary-foreground rounded-full px-6"
            data-ocid="task.save_button"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
