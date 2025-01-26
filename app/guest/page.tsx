"use client";

import { useState, useEffect } from "react";
import { NextMatch } from "@/components/guest/next-match";
import { TournamentStandings } from "@/components/guest/tournament-standings";
import { TournamentCalendar } from "@/components/guest/tournament-calendar";
import { GuestTournamentBracket } from "@/components/guest/guest-tournament-bracket";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const fetchTournaments = async () => {
      try {
        const response = await axios.get('/api/get-tournament');
        if (response.data.success && response.data.data.length > 0) {
          setTournaments(response.data.data);
          setSelectedTournamentId(response.data.data[0]._id);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  return (
    <div className="space-y-4 md:space-y-8 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Tournament Dashboard</h1>
        {loading ? (
          <div className="w-full sm:w-[250px] h-10 bg-white/5 animate-pulse rounded-md" />
        ) : (
          <Select
            value={selectedTournamentId}
            onValueChange={setSelectedTournamentId}
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
        )}
      </div>
      
      {/* League Standings */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <TournamentStandings selectedTournamentId={selectedTournamentId} />
        </div>
      </div>
      
      {/* Tournament Bracket */}
      <div className="overflow-x-auto">
        <div className="min-w-[768px] md:min-w-full">
          <GuestTournamentBracket selectedTournamentId={selectedTournamentId} />
        </div>
      </div>
      
      {/* Upcoming Match */}
      <div className="w-full lg:max-w-3xl">
        <NextMatch />
      </div>
      
      {/* Calendar */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          <TournamentCalendar />
        </div>
      </div>
    </div>
  );
}