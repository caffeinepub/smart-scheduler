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
import type { Event } from "../backend.d";

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    startTime: bigint;
    endTime: bigint;
    category: string;
    priority: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  event?: Event | null;
  defaultDate?: Date | null;
}

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export function EventModal({
  open,
  onClose,
  onSave,
  onDelete,
  event,
  defaultDate,
}: EventModalProps) {
  const isEdit = !!event;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Work");
  const [priority, setPriority] = useState("medium");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setDescription(event.description);
      setCategory(event.category);
      setPriority(event.priority);
      setStartTime(toDatetimeLocal(Number(event.startTime)));
      setEndTime(toDatetimeLocal(Number(event.endTime)));
    } else {
      const base = defaultDate ?? new Date();
      const start = new Date(base);
      start.setHours(9, 0, 0, 0);
      const end = new Date(base);
      end.setHours(10, 0, 0, 0);
      setTitle("");
      setDescription("");
      setCategory("Work");
      setPriority("medium");
      setStartTime(toDatetimeLocal(start.getTime()));
      setEndTime(toDatetimeLocal(end.getTime()));
    }
    setErrors({});
  }, [open, event, defaultDate]);

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Title is required";
    if (!startTime) e.startTime = "Start time is required";
    if (!endTime) e.endTime = "End time is required";
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      e.endTime = "End must be after start";
    }
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
        startTime: BigInt(new Date(startTime).getTime()),
        endTime: BigInt(new Date(endTime).getTime()),
        category,
        priority,
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
        data-ocid={isEdit ? "event_edit.dialog" : "event_add.dialog"}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit Event" : "Add Event"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              data-ocid="event.input"
            />
            {errors.title && (
              <p
                className="text-xs text-destructive"
                data-ocid="event_title.error_state"
              >
                {errors.title}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="event-desc">Description</Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              data-ocid="event_desc.textarea"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-ocid="event_category.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                  <SelectItem value="Work">Work</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-ocid="event_priority.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="event-start">Start</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                data-ocid="event_start.input"
              />
              {errors.startTime && (
                <p
                  className="text-xs text-destructive"
                  data-ocid="event_start.error_state"
                >
                  {errors.startTime}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="event-end">End</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                data-ocid="event_end.input"
              />
              {errors.endTime && (
                <p
                  className="text-xs text-destructive"
                  data-ocid="event_end.error_state"
                >
                  {errors.endTime}
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
              data-ocid="event.delete_button"
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
            data-ocid="event.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || deleting}
            className="bg-primary text-primary-foreground rounded-full px-6"
            data-ocid="event.save_button"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
