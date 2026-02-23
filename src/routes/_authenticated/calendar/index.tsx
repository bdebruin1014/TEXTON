import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/calendar/")({
  component: CalendarPage,
});

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  event_type: string;
  all_day: boolean;
  description: string | null;
}

interface EventFormData {
  title: string;
  event_type: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  description: string;
}

const EVENT_COLORS: Record<string, string> = {
  milestone: "#143A23",
  inspection: "#3B6FA0",
  closing: "#3D7A4E",
  construction: "#C4841D",
  capital_call: "#8B5CF6",
  meeting: "#6366F1",
  deadline: "#B84040",
  other: "#64748B",
};

const EVENT_LABELS: Record<string, string> = {
  milestone: "Project Milestone",
  inspection: "Inspection",
  closing: "Closing",
  construction: "Construction",
  capital_call: "Capital Call",
  meeting: "Meeting",
  deadline: "Deadline",
  other: "Other",
};

const EMPTY_FORM: EventFormData = {
  title: "",
  event_type: "other",
  start_date: "",
  end_date: "",
  all_day: false,
  description: "",
};

function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const queryClient = useQueryClient();
  const [currentView, setCurrentView] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("dayGridMonth");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormData>(EMPTY_FORM);

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_events").select("*").order("start_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const createEvent = useMutation({
    mutationFn: async (data: EventFormData) => {
      const { error } = await supabase.from("calendar_events").insert({
        title: data.title,
        event_type: data.event_type,
        start_date: data.start_date,
        end_date: data.end_date || null,
        all_day: data.all_day,
        description: data.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event created");
      closeModal();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create event"),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EventFormData }) => {
      const { error } = await supabase
        .from("calendar_events")
        .update({
          title: data.title,
          event_type: data.event_type,
          start_date: data.start_date,
          end_date: data.end_date || null,
          all_day: data.all_day,
          description: data.description || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event updated");
      closeModal();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update event"),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event deleted");
      closeModal();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete event"),
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openCreate = (dateStr?: string) => {
    const startDate = dateStr ? `${dateStr}T09:00` : "";
    setForm({ ...EMPTY_FORM, start_date: startDate });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    setForm({
      title: event.title,
      event_type: event.event_type,
      start_date: event.start_date?.replace(" ", "T")?.slice(0, 16) ?? "",
      end_date: event.end_date?.replace(" ", "T")?.slice(0, 16) ?? "",
      all_day: event.all_day,
      description: event.description ?? "",
    });
    setEditingId(event.id);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.start_date) {
      toast.error("Start date is required");
      return;
    }
    if (editingId) {
      updateEvent.mutate({ id: editingId, data: form });
    } else {
      createEvent.mutate(form);
    }
  };

  const calendarEvents = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start_date,
        end: event.end_date ?? undefined,
        allDay: event.all_day,
        backgroundColor: EVENT_COLORS[event.event_type] ?? EVENT_COLORS.other,
        borderColor: EVENT_COLORS[event.event_type] ?? EVENT_COLORS.other,
        extendedProps: { event_type: event.event_type, description: event.description },
      })),
    [events],
  );

  const changeView = (view: "dayGridMonth" | "timeGridWeek" | "timeGridDay") => {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  };

  const isPending = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
          <p className="mt-0.5 text-sm text-muted">{events.length} events across all modules</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-border">
            {(
              [
                { key: "dayGridMonth", label: "Month" },
                { key: "timeGridWeek", label: "Week" },
                { key: "timeGridDay", label: "Day" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => changeView(key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  currentView === key ? "bg-button text-white" : "text-muted hover:bg-card-hover"
                } ${key === "dayGridMonth" ? "rounded-l-lg" : key === "timeGridDay" ? "rounded-r-lg" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover"
          >
            + New Event
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {Object.entries(EVENT_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: EVENT_COLORS[key] }} />
            <span className="text-xs text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          height="auto"
          editable={false}
          selectable
          dayMaxEvents={3}
          eventDisplay="block"
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          dateClick={(info) => openCreate(info.dateStr)}
          eventClick={(info) => openEdit(info.event.id)}
        />
      </div>

      {/* Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
          <div
            className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editingId ? "Edit Event" : "New Event"}</h2>
              <button type="button" onClick={closeModal} className="text-muted hover:text-foreground">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Event title"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Event Type</label>
                <select
                  value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {Object.entries(EVENT_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Start</label>
                  <input
                    type={form.all_day ? "date" : "datetime-local"}
                    value={form.all_day ? form.start_date.split("T")[0] : form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">End</label>
                  <input
                    type={form.all_day ? "date" : "datetime-local"}
                    value={form.all_day ? (form.end_date.split("T")[0] ?? "") : form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="all_day"
                  checked={form.all_day}
                  onChange={(e) => setForm({ ...form, all_day: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="all_day" className="text-sm text-foreground">
                  All day event
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Optional description"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => deleteEvent.mutate(editingId)}
                    disabled={isPending}
                    className="rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                  >
                    Delete
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card-hover"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-button px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-button-hover disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : editingId ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
