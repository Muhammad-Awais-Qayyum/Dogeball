"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import axios from "axios";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  setHours,
  setMinutes,
} from "date-fns";
import { useDrop } from "react-dnd";
import { cn } from "@/lib/utils";
import { TimePickerModal } from "./time-picker-modal";
import { MatchScoringModal } from "./match-scoring-modal";
import { useToast } from "@/hooks/use-toast";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  "en-US": require("date-fns/locale/en-US"),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface MatchEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  round: number;
  matchType?: 'quarterfinal' | 'semifinal' | 'final';
  roundType?: string;
  status: "scheduled" | "in_progress" | "completed";
  homeTeam: {
    id: string;
    name: string;
    photo?: {
      url: string | null;
    };
  };
  awayTeam: {
    id: string;
    name: string;
    photo?: {
      url: string | null;
    };
  };
}

interface CalendarProps {
  events: MatchEvent[];
  isEditing: boolean;
  onMatchScheduled: (match: any, date: Date) => void;
}

export function Calendar({
  events,
  isEditing,
  onMatchScheduled,
}: CalendarProps) {
  const { toast } = useToast();
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduledMatches, setScheduledMatches] = useState<MatchEvent[]>([]);
  const [timePickerState, setTimePickerState] = useState({
    isOpen: false,
    match: null as any,
    date: null as Date | null,
  });

  const [scoringState, setScoringState] = useState({
    isOpen: false,
    match: null as any,
  });

  useEffect(() => {
    const fetchScheduledMatches = async () => {
      try {
        const response = await axios.get("/api/get-all-scheduled-matches");
        if (response.data.success) {
          const formattedMatches = response.data.data.map((match: any) => ({
            id: match._id,
            title: `${match.homeTeamId.teamName} vs ${match.awayTeamId.teamName}`,
            start: new Date(match.scheduledDate),
            end: new Date(match.endDate),
            round: match.round,
            matchType: match.matchType,
            roundType: match.roundType,
            status: match.status,
            homeTeam: {
              id: match.homeTeamId._id,
              name: match.homeTeamId.teamName,
              photo: match.homeTeamId.teamPhoto,
            },
            awayTeam: {
              id: match.awayTeamId._id,
              name: match.awayTeamId.teamName,
              photo: match.awayTeamId.teamPhoto,
            },
          }));
          setScheduledMatches(formattedMatches);
        }
      } catch (error) {
        console.error("Error fetching matches:", error);
      }
    };

    fetchScheduledMatches();
  }, []);

  const handleScoreSubmit = async (scores: {
    homeScore: number;
    awayScore: number;
    homePins: number;
    awayPins: number;
    status: "completed";
  }) => {
    if (scoringState.match) {
      try {
        const response = await axios.put(`/api/update-match-score/${scoringState.match.id}`, scores);
        
        if (response.data.success) {
          setScheduledMatches((prev) =>
            prev.map((match) =>
              match.id === scoringState.match.id
                ? {
                    ...match,
                    status: "completed",
                  }
                : match
            )
          );

          toast({
            title: "Success",
            description: "Match score updated successfully",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update match score",
          variant: "destructive",
        });
      }
    }
  };

  const handleEventClick = (event: MatchEvent) => {
    if (!isEditing && event.status !== "completed") {
      if (event.matchType === 'quarterfinal' || 
          event.matchType === 'semifinal' || 
          event.matchType === 'final') {
        toast({
          title: "Score Update Restricted",
          description: "Please update the score in the tournament bracket section",
          variant: 'destructive'
        });
        return;
      }

      const matchData = {
        id: event.id,
        homeTeam: event.homeTeam.name,
        awayTeam: event.awayTeam.name,
        homeTeamPhoto: event.homeTeam.photo,
        awayTeamPhoto: event.awayTeam.photo,
        start: event.start,
        status: event.status,
        matchType: event.matchType
      };

      setScoringState({
        isOpen: true,
        match: matchData,
      });
    }
  };

  const [{ isOver }, drop] = useDrop({
    accept: "match",
    hover: (item, monitor) => {
      const calendar = calendarRef.current;
      if (!calendar) return;

      const clientOffset = monitor.getClientOffset();
      if (clientOffset) {
        const cells = calendar.querySelectorAll(".rbc-day-bg");
        cells.forEach((cell) => {
          cell.classList.remove("bg-white/10");
          const rect = cell.getBoundingClientRect();
          if (
            clientOffset.x >= rect.left &&
            clientOffset.x <= rect.right &&
            clientOffset.y >= rect.top &&
            clientOffset.y <= rect.bottom
          ) {
            cell.classList.add("bg-white/10");
          }
        });
      }
    },
    drop: (item: any, monitor) => {
      const calendar = calendarRef.current;
      if (!calendar || !isEditing) return;

      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const cells = calendar.querySelectorAll(".rbc-day-bg");
      let droppedDate: Date | null = null;

      cells.forEach((cell) => {
        const rect = cell.getBoundingClientRect();
        if (
          clientOffset.x >= rect.left &&
          clientOffset.x <= rect.right &&
          clientOffset.y >= rect.top &&
          clientOffset.y <= rect.bottom
        ) {
          const dateAttr = cell.getAttribute("data-date");
          if (dateAttr) {
            droppedDate = new Date(dateAttr);
          }
        }
        cell.classList.remove("bg-white/10");
      });

      if (droppedDate) {
        setTimePickerState({
          isOpen: true,
          match: item,
          date: droppedDate,
        });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const handleTimeSelected = (hours: number, minutes: number) => {
    if (timePickerState.date && timePickerState.match) {
      const scheduledDate = setMinutes(
        setHours(timePickerState.date, hours),
        minutes
      );
      onMatchScheduled(timePickerState.match, scheduledDate);
      setTimePickerState({ isOpen: false, match: null, date: null });
    }
  };

  return (
    <>
      <div
        ref={(node) => {
          drop(node);
          if (node) {
            calendarRef.current = node;
          }
        }}
        className={cn(
          "h-[calc(100vh-10rem)] bg-white/5 rounded-lg   p-4",
          isEditing && "cursor-copy",
          isOver && "ring-2 ring-blue-500/50"
        )}
      >
        
        <BigCalendar
          localizer={localizer}
          events={[...events, ...scheduledMatches]}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          views={["month", "week", "day"]}
          defaultView="month"
          date={currentDate}
          onNavigate={date => setCurrentDate(date)}
          selectable={isEditing}
          className="calendar-dark"
          tooltipAccessor={(event: MatchEvent) => event.title}
          onSelectEvent={handleEventClick}
          components={{
            dateCellWrapper: (props: any) => {
              const { children, value } = props;
              return React.cloneElement(children, {
                "data-date": value.toISOString(),
              });
            },
          }}
          eventPropGetter={(event: MatchEvent) => {
            const statusClass = event.status.toLowerCase();
            return {
              className: `rbc-event ${statusClass}`,
            };
          }}
        />
      </div>

      <TimePickerModal
        open={timePickerState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTimePickerState({ isOpen: false, match: null, date: null });
          }
        }}
        onTimeSelected={handleTimeSelected}
        match={timePickerState.match}
        date={timePickerState.date}
      />

      <MatchScoringModal
        open={scoringState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setScoringState({ isOpen: false, match: null });
          }
        }}
        match={scoringState.match}
        onScoreSubmit={handleScoreSubmit}
      />
    </>
  );
}