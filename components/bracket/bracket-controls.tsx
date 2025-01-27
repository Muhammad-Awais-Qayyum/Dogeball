"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Tournament {
  _id: string;
  tournamentName: string;
  numberOfTeams: number;
  numberOfRounds: number;
  roundStatuses: boolean[];
  progress: "In Progress" | "Completed";
}

interface BracketControlsProps {
  onTournamentSelect: (tournament: Tournament) => void;
}

export function BracketControls({ onTournamentSelect }: BracketControlsProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('/api/get-tournament', {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch tournaments');
        }

        if (data.success) {
          setTournaments(data.data);
          if (data.data.length > 0) {
            setSelectedTournamentId(data.data[0]._id);
            onTournamentSelect(data.data[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournaments();
  }, [onTournamentSelect]);

  const handleTournamentChange = (value: string) => {
    setSelectedTournamentId(value);
    const tournament = tournaments.find(t => t._id === value);
    if (tournament) {
      onTournamentSelect(tournament);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className="w-[200px] h-10 bg-white/5 animate-pulse rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Select 
        value={selectedTournamentId}
        onValueChange={handleTournamentChange}
      >
        <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
          <SelectValue placeholder="Select tournament" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-white/10">
          {tournaments.map((tournament) => (
            <SelectItem 
              key={tournament._id} 
              value={tournament._id}
              className="text-white hover:bg-white/5"
            >
              {tournament.tournamentName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}