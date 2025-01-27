"use client";

import { useEffect, useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format: (date: Date, formatStr: string) => format(date, formatStr.replace('n', 'N')),
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Team {
  _id: string;
  teamName: string;
  teamPhoto: {
    url: string | null;
    publicId: string | null;
  };
}

interface ScheduledMatch {
  _id: string;
  homeTeamId: Team;
  awayTeamId: Team;
  scheduledDate: string;
  endDate: string;
  status: 'scheduled' | 'completed';
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isCompleted: boolean;
  homeTeam: string;
  awayTeam: string;
}

export function TournamentCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/get-all-scheduled-matches", {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch matches');
        }

        const data = await response.json();
        
        if (data.success) {
          const matchEvents: CalendarEvent[] = data.data
            .filter((match: ScheduledMatch) => 
              match.scheduledDate && 
              match.homeTeamId?.teamName && 
              match.awayTeamId?.teamName
            )
            .map((match: ScheduledMatch) => ({
              id: match._id,
              title: `${match.homeTeamId.teamName} vs ${match.awayTeamId.teamName}`,
              start: new Date(match.scheduledDate),
              end: match.endDate ? new Date(match.endDate) : new Date(new Date(match.scheduledDate).getTime() + 60 * 60 * 1000),
              isCompleted: match.status === 'completed',
              homeTeam: match.homeTeamId.teamName,
              awayTeam: match.awayTeamId.teamName
            }));
          
          setEvents(matchEvents);
        } else {
          setError("No matches found");
        }
      } catch (error) {
        console.error("Error fetching matches:", error);
        setError("Failed to load matches");
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, []);

  if (loading) {
    return (
      <Card className="bg-white/10 border-white/10">
        <CardContent className="flex items-center justify-center h-[400px] sm:h-[500px] md:h-[600px]">
          <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-blue-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 border-white/10">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-lg md:text-xl text-white">Tournament Calendar</CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 md:p-6">
        <div className="h-[600px]  md:h-[700px]">
          <style jsx global>{`
            .calendar-dark {
              color: white;
            }
            .calendar-dark .rbc-toolbar {
              flex-wrap: wrap;
              gap: 0.5rem;
              margin-bottom: 1rem;
            }
            .calendar-dark .rbc-toolbar button {
              font-size: 0.875rem;
              padding: 0.375rem 0.75rem;
            }
            @media (max-width: 640px) {
              .calendar-dark .rbc-toolbar {
                justify-content: center;
              }
              .calendar-dark .rbc-toolbar button {
                font-size: 0.75rem;
                padding: 0.25rem 0.5rem;
              }
              .calendar-dark .rbc-toolbar-label {
                width: 100%;
                text-align: center;
                margin: 0.5rem 0;
              }
              .calendar-dark .rbc-event-label,
              .calendar-dark .rbc-event-content {
                font-size: 0.75rem;
              }
            }
            .calendar-dark .rbc-month-view,
            .calendar-dark .rbc-time-view {
              border-color: rgba(255, 255, 255, 0.1);
            }
            .calendar-dark .rbc-header,
            .calendar-dark .rbc-time-header {
              border-color: rgba(255, 255, 255, 0.1);
            }
            .calendar-dark .rbc-day-bg + .rbc-day-bg,
            .calendar-dark .rbc-month-row + .rbc-month-row {
              border-color: rgba(255, 255, 255, 0.1);
            }
            .calendar-dark .rbc-off-range {
              color: rgba(255, 255, 255, 0.3);
            }
            .calendar-dark .rbc-off-range-bg {
              background: rgba(255, 255, 255, 0.05);
            }
            .calendar-dark .rbc-event {
              border-radius: 4px;
              padding: 2px 4px;
            }
            @media (max-width: 640px) {
              .calendar-dark .rbc-event {
                padding: 1px 2px;
              }
              .calendar-dark .rbc-date-cell {
                font-size: 0.75rem;
              }
              .calendar-dark .rbc-header {
                font-size: 0.75rem;
                padding: 0.25rem;
              }
            }
            .calendar-dark .rbc-toolbar button {
              color: white;
              background-color: rgba(255, 255, 255, 0.1);
              border-color: rgba(255, 255, 255, 0.2);
            }
            .calendar-dark .rbc-toolbar button:hover {
              background-color: rgba(255, 255, 255, 0.2);
            }
            .calendar-dark .rbc-toolbar button.rbc-active {
              background-color: rgba(37, 99, 235, 0.8);
              border-color: rgba(37, 99, 235, 0.9);
            }
            .calendar-dark .rbc-toolbar button.rbc-active:hover {
              background-color: rgba(37, 99, 235, 0.9);
            }
          `}</style>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            className="calendar-dark"
            views={["month", "week", "day"]}
            defaultView="month"
            toolbar={true}
            date={date}
            onNavigate={setDate}
            eventPropGetter={(event: CalendarEvent) => ({
              style: {
                backgroundColor: event.isCompleted ? '#22c55e' : '#2563eb',
                borderColor: event.isCompleted ? '#16a34a' : '#1d4ed8',
                color: 'white',
              },
            })}
            formats={{
              eventTimeRangeFormat: ({ start }: { start: Date; end: Date }) => {
                const timeStr = format(start, 'h:mm a');
                const matchEvent = events.find(e => 
                  e.start.getTime() === start.getTime()
                );
                if (!matchEvent) return timeStr;
                
                if (window.innerWidth < 640) {
                  return `${timeStr} ${matchEvent.homeTeam} v ${matchEvent.awayTeam}`;
                }
                return `${timeStr} - ${matchEvent.homeTeam} vs ${matchEvent.awayTeam}`;
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default TournamentCalendar;