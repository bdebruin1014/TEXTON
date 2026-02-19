import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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

const EVENT_COLORS: Record<string, string> = {
  milestone: "#1B3022",
  inspection: "#3B6FA0",
  closing: "#48BB78",
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

function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">("dayGridMonth");

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_events").select("*").order("start_date");
      if (error) throw error;
      return data ?? [];
    },
  });

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
                  currentView === key ? "bg-primary text-white" : "text-muted hover:bg-gray-50"
                } ${key === "dayGridMonth" ? "rounded-l-lg" : key === "timeGridDay" ? "rounded-r-lg" : ""}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            New Event
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
        />
      </div>
    </div>
  );
}
