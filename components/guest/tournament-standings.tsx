'use client';

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface Team {
  _id: string;
  teamName: string;
  teamPhoto: {
    url: string | null;
    publicId: string | null;
  };
  wins: number;
  ties: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  pins: number;
}

interface TournamentStandingsProps {
  selectedTournamentId: string;
}

function sortTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    const pointsA = (a.wins * 3) + a.ties;
    const pointsB = (b.wins * 3) + b.ties;
    const pointsDiff = pointsB - pointsA;
    if (pointsDiff !== 0) return pointsDiff;

    const goalDiffA = a.goalsFor - a.goalsAgainst;
    const goalDiffB = b.goalsFor - b.goalsAgainst;
    const goalDiff = goalDiffB - goalDiffA;
    if (goalDiff !== 0) return goalDiff;

    const goalsScoredDiff = b.goalsFor - a.goalsFor;
    if (goalsScoredDiff !== 0) return goalsScoredDiff;

    const pinsDiff = b.pins - a.pins;
    if (pinsDiff !== 0) return pinsDiff;

    return a.teamName.localeCompare(b.teamName);
  });
}

export function TournamentStandings({ selectedTournamentId }: TournamentStandingsProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!selectedTournamentId) return;
      
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/get-teams", {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tournamentId: selectedTournamentId
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch teams');
        }

        const data = await response.json();
        
        if (data.success) {
          const sortedTeams = sortTeams(data.data);
          setTeams(sortedTeams);
        } else {
          throw new Error(data.message || 'Failed to load teams data');
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
        setError("Failed to load teams data");
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [selectedTournamentId]);

  if (!selectedTournamentId) {
    return (
      <Card className="bg-white/10 border-white/10">
        <CardContent className="p-4 sm:p-6">
          <div className="text-white text-center">Please select a tournament</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 border-white/10">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-white text-xl md:text-2xl">League Standings</CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48 md:h-64">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <div className="text-red-400 p-4">{error}</div>
        ) : !teams.length ? (
          <div className="text-white text-center p-4">No teams available</div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="min-w-[640px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-blue-400 text-sm md:text-base">Team</TableHead>
                    <TableHead className="text-blue-400 text-center text-sm md:text-base">W</TableHead>
                    <TableHead className="text-blue-400 text-center text-sm md:text-base">T</TableHead>
                    <TableHead className="text-blue-400 text-center text-sm md:text-base">L</TableHead>
                    <TableHead className="text-blue-400 text-center text-sm md:text-base">GF</TableHead>
                    <TableHead className="text-blue-400 text-center text-sm md:text-base">GA</TableHead>
                    <TableHead className="text-blue-400 text-center text-sm md:text-base">Pins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow
                      key={team._id}
                      className="border-white/10 hover:bg-white/5"
                    >
                      <TableCell className="font-medium text-white text-sm md:text-base">
                        <div className="flex items-center gap-2 md:gap-3">
                          <Avatar className="h-6 w-6 md:h-8 md:w-8 bg-white/10">
                            {team.teamPhoto?.url ? (
                              <img src={team.teamPhoto.url} alt={team.teamName} />
                            ) : (
                              <span className="text-xs md:text-sm">{team.teamName[0]}</span>
                            )}
                          </Avatar>
                          <span className="truncate">{team.teamName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-white text-sm md:text-base p-2 md:p-4">
                        {team.wins}
                      </TableCell>
                      <TableCell className="text-center text-white text-sm md:text-base p-2 md:p-4">
                        {team.ties}
                      </TableCell>
                      <TableCell className="text-center text-white text-sm md:text-base p-2 md:p-4">
                        {team.losses}
                      </TableCell>
                      <TableCell className="text-center text-white text-sm md:text-base p-2 md:p-4">
                        {team.goalsFor}
                      </TableCell>
                      <TableCell className="text-center text-white text-sm md:text-base p-2 md:p-4">
                        {team.goalsAgainst}
                      </TableCell>
                      <TableCell className="text-center text-white text-sm md:text-base p-2 md:p-4">
                        {team.pins}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}