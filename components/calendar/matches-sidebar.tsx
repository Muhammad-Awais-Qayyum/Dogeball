"use client";

import { useMemo, useState } from "react";
import { useDrag } from "react-dnd";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Match {
  id: number;
  round: number;
  homeTeam: string;
  awayTeam: string;
}

interface MatchItemProps {
  match: Match;
  isEditing: boolean;
}

function MatchItem({ match, isEditing }: MatchItemProps) {
  const [{ isDragging }, drag] = useDrag({
    type: "match",
    item: () => ({ ...match }),
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: () => isEditing,
  });

  return (
    <div
      ref={drag}
      className={cn(
        "p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors",
        isDragging && "opacity-50",
        isEditing ? "cursor-move" : "cursor-default"
      )}
    >
      <div className="text-sm font-medium text-white">
        {match.homeTeam} vs {match.awayTeam}
      </div>
      <div className="text-xs text-blue-400">Round {match.round}</div>
    </div>
  );
}

interface MatchesSidebarProps {
  matches: Match[];
  isEditing: boolean;
}

export function MatchesSidebar({ matches, isEditing }: MatchesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndSortedMatches = useMemo(() => {
    return [...matches]
      .filter((match) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          match.homeTeam.toLowerCase().includes(searchLower) ||
          match.awayTeam.toLowerCase().includes(searchLower) ||
          `round ${match.round}`.includes(searchLower)
        );
      })
      .sort((a, b) => a.round - b.round);
  }, [matches, searchQuery]);

  return (
    <div className="h-full p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white">
        Unscheduled Matches
      </h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search matches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
        />
      </div>
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="space-y-2 pr-4">
          {filteredAndSortedMatches.map((match) => (
            <MatchItem
              key={match.id}
              match={match}
              isEditing={isEditing}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}