"use client";

import { useState, useEffect } from "react";
import { NextMatch } from "@/components/guest/next-match";
import { TournamentStandings } from "@/components/guest/tournament-standings";
import { TournamentCalendar } from "@/components/guest/tournament-calendar";
import { GuestTournamentBracket } from "@/components/guest/guest-tournament-bracket";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";

interface Tournament {
 _id: string;
 tournamentName: string;
 numberOfTeams: number;
 numberOfRounds: number;
 roundStatuses: boolean[];
 progress: "Not Started" | "In Progress" | "Completed";
}

export default function GuestDashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await axios.get('/api/get-tournament', {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Pragma': 'no-cache'
            }
          });

          if (response.data.success && response.data.data.length > 0) {
            setTournaments(response.data.data);
            setSelectedTournamentId(response.data.data[0]._id);
            break;
          }
        } catch (error) {
          console.error(`Attempt ${i + 1} failed:`, error);
          if (i === retries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }
      setLoading(false);
    };

    fetchTournaments();
  }, []);

  const handleTournamentChange = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
  };

  return (
    <div className="space-y-4 md:space-y-8 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Tournament Dashboard</h1>
        <Select
          value={selectedTournamentId}
          onValueChange={handleTournamentChange}
        >
          <SelectTrigger className="w-full sm:w-[250px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Select tournament" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-white/10 max-h-[300px] overflow-y-auto">
            {tournaments.map((tournament) => (
              <SelectItem
                key={tournament._id}
                value={tournament._id}
                className="text-white hover:bg-white/5 text-sm md:text-base"
              >
                {tournament.tournamentName} ({tournament.progress})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedTournamentId && (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <TournamentStandings selectedTournamentId={selectedTournamentId} />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-[768px] md:min-w-full">
              <GuestTournamentBracket selectedTournamentId={selectedTournamentId} />
            </div>
          </div>
          
          <div className="w-full lg:max-w-3xl">
            <NextMatch />
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <TournamentCalendar />
            </div>
          </div>
        </>
      )}
    </div>
  );
}