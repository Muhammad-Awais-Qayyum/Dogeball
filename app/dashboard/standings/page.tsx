"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isFuture, isPast } from "date-fns";

interface Tournament {
  _id: string;
  tournamentName: string;
  numberOfTeams: number;
  numberOfRounds: number;
  progress: 'Not Started' | 'In Progress' | 'Completed';
  createdAt: string;
  updatedAt: string;
}

interface Team {
  _id: string;
  teamName: string;
  teamPhoto: {
    url: string | null;
    publicId: string | null;
  };
  tournamentId: string;
  teamMembers: any[];
  substitutePlayers: any[];
  wins: number;
  ties: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  pins: number;
  createdAt: string;
  updatedAt: string;
}

interface Match {
  _id: string;
  homeTeamId: string;
  awayTeamId: string;
  tournamentId: string;
  scheduledDate: string;
  endDate: string;
  round: number;
  status: 'scheduled' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[50vh] lg:h-[92vh] w-full">
    <div className="flex flex-col items-center gap-2 md:gap-4 p-4">
      <Loader2 className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 animate-spin text-white" />
      <p className="text-white text-xs md:text-sm lg:text-base text-center">Loading standings...</p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] lg:h-[92vh] p-4">
    <h1 className="text-lg md:text-xl lg:text-2xl font-semibold text-white mb-2 text-center">No Tournaments Available</h1>
    <p className="text-gray-400 text-xs md:text-sm lg:text-base text-center">There are no tournaments created yet.</p>
  </div>
);

function calculatePoints(team: Team): number {
  return (team.wins * 3) + team.ties;
}

function calculateGoalDifference(team: Team): number {
  return team.goalsFor - team.goalsAgainst;
}

function sortTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    const pointsDiff = calculatePoints(b) - calculatePoints(a);
    if (pointsDiff !== 0) return pointsDiff;

    const goalDiff = calculateGoalDifference(b) - calculateGoalDifference(a);
    if (goalDiff !== 0) return goalDiff;

    const goalsScoredDiff = b.goalsFor - a.goalsFor;
    if (goalsScoredDiff !== 0) return goalsScoredDiff;

    const pinsDiff = b.pins - a.pins;
    if (pinsDiff !== 0) return pinsDiff;

    return a.teamName.localeCompare(b.teamName);
  });
}

function findNextUpcomingMatch(matches: Match[]): Match | null {
  const now = new Date();
  
  const futureMatches = matches
    .filter(match => 
      match.status === 'scheduled' && 
      isFuture(new Date(match.scheduledDate))
    )
    .sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

  if (futureMatches.length > 0) {
    return futureMatches[0];
  }

  const inProgressMatches = matches
    .filter(match => match.status === 'in_progress')
    .sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

  if (inProgressMatches.length > 0) {
    return inProgressMatches[0];
  }

  const scheduledMatches = matches
    .filter(match => match.status === 'scheduled')
    .sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

  return scheduledMatches[0] || null;
}

export default function StandingsPage() {
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!upcomingMatch) return;

    const checkMatchStatus = () => {
      const matchTime = new Date(upcomingMatch.scheduledDate);
      const endTime = new Date(upcomingMatch.endDate);
      const now = new Date();

      if (isPast(endTime) && upcomingMatch.status === 'scheduled') {
        fetchData();
      }
    };

    const timer = setInterval(checkMatchStatus, 60000); 
    return () => clearInterval(timer);
  }, [upcomingMatch]);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await axios.get("/api/get-tournament");
        if (response.data.success) {
          setTournaments(response.data.data);
          if (response.data.data.length > 0) {
            setSelectedTournament(response.data.data[0]._id);
          }
        }
      } catch (error) {
        console.error("Error fetching tournaments:", error);
        setError("Failed to load tournaments.");
      }
    };

    fetchTournaments();
  }, []);

  const fetchData = async () => {
    if (!selectedTournament) return;
    
    try {
      setLoading(true);
      setError(null);
      
      setHomeTeam(null);
      setAwayTeam(null);
      
      const matchesResponse = await axios.get("/api/get-all-scheduled-matches");
      if (matchesResponse.data.success) {
        const matches = matchesResponse.data.data.filter(
          (match: Match) => match.tournamentId === selectedTournament
        );
        
        const nextMatch = findNextUpcomingMatch(matches);
        if (nextMatch) {
          setUpcomingMatch(nextMatch);
          
          try {
            const [homeTeamRes, awayTeamRes] = await Promise.all([
              axios.post("/api/get-teams", { teamId: nextMatch.homeTeamId }),
              axios.post("/api/get-teams", { teamId: nextMatch.awayTeamId })
            ]);
            
            if (homeTeamRes.data.success) {
              setHomeTeam(homeTeamRes.data.data);
            }
            if (awayTeamRes.data.success) {
              setAwayTeam(awayTeamRes.data.data);
            }
          } catch (error) {
            console.error("Error fetching match teams:", error);
          }
        } else {
          setUpcomingMatch(null);
        }
      }

      const teamsResponse = await axios.post("/api/get-teams", {
        tournamentId: selectedTournament
      });

      if (teamsResponse.data.success) {
        const sortedTeams = sortTeams(teamsResponse.data.data);
        setTeams(sortedTeams);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data. Please try again later.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTournament]);

  const displayTeams = teams;

  if (!tournaments.length) {
    return <EmptyState />;
  }

  if (loading && !teams.length) {
    return <LoadingSpinner />;
  }

  if (error && !teams.length) {
    return (
      <div className="flex items-center justify-center min-h-[200px] sm:min-h-[300px] md:min-h-[400px] p-4">
        <p className="text-red-500 text-xs md:text-sm lg:text-base text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-white">Tournament Standings</h1>
        <Select
          value={selectedTournament}
          onValueChange={setSelectedTournament}
        >
          <SelectTrigger className="w-full sm:w-[250px] bg-white/5 border-white/10 text-white text-sm md:text-base">
            <SelectValue placeholder="Select tournament" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-white/10">
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

      {upcomingMatch && homeTeam && awayTeam ? (
        <div className="space-y-4 md:space-y-6">
          <h2 className="text-lg md:text-xl font-semibold text-white">
            {upcomingMatch.status === 'in_progress' ? 'Current Match' : 'Upcoming Match'}
          </h2>
          <div className="bg-white/5 rounded-lg p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-between">
              {/* Home Team */}
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <Avatar className="h-10 w-10 md:h-12 md:w-12 bg-white/10">
                  {homeTeam.teamPhoto?.url ? (
                    <img src={homeTeam.teamPhoto.url} alt={homeTeam.teamName} />
                  ) : (
                    <span className="text-base md:text-lg">{homeTeam.teamName[0]}</span>
                  )}
                </Avatar>
                <div>
                  <p className="text-base md:text-lg font-semibold text-white">
                    {homeTeam.teamName}
                  </p>
                </div>
              </div>

              <div className="text-xl md:text-2xl font-bold text-white">VS</div>

              {/* Away Team */}
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="text-right">
                  <p className="text-base md:text-lg font-semibold text-white">
                    {awayTeam.teamName}
                  </p>
                </div>
                <Avatar className="h-10 w-10 md:h-12 md:w-12 bg-white/10">
                  {awayTeam.teamPhoto?.url ? (
                    <img src={awayTeam.teamPhoto.url} alt={awayTeam.teamName} />
                  ) : (
                    <span className="text-base md:text-lg">{awayTeam.teamName[0]}</span>
                  )}
                </Avatar>
              </div>

              {/* Match Time */}
              <div className="text-center sm:text-right w-full sm:w-auto">
                <p className="text-xl md:text-2xl font-bold text-white">
                  {format(new Date(upcomingMatch.scheduledDate), "dd/MM/yyyy")}
                </p>
                <p className="text-base md:text-lg text-gray-400">
                  {format(new Date(upcomingMatch.scheduledDate), "HH:mm")}
                </p>
                {upcomingMatch.status === 'in_progress' && (
                  <p className="text-xs md:text-sm text-green-400 mt-1">In Progress</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-lg p-4 md:p-6 text-center">
          <h2 className="text-lg md:text-xl font-semibold text-white mb-2">No Upcoming Matches</h2>
          <p className="text-gray-400 text-sm md:text-base">There are no scheduled matches at the moment.</p>
        </div>
      )}

      <div className="space-y-4 md:space-y-6">
        <h2 className="text-lg md:text-xl font-semibold text-white">Standings</h2>
        <div className="rounded-lg border border-white/10 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-blue-400 text-xs md:text-sm whitespace-nowrap">Team</TableHead>
                <TableHead className="text-blue-400 text-center text-xs md:text-sm">W</TableHead>
                <TableHead className="text-blue-400 text-center text-xs md:text-sm">T</TableHead>
                <TableHead className="text-blue-400 text-center text-xs md:text-sm">L</TableHead>
                <TableHead className="text-blue-400 text-center text-xs md:text-sm">GF</TableHead>
                <TableHead className="text-blue-400 text-center text-xs md:text-sm">GA</TableHead>
                <TableHead className="text-blue-400 text-center text-xs md:text-sm">Pins</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTeams.map((team) => (
                <TableRow
                  key={team._id}
                  className="border-white/10 hover:bg-white/5"
                >
                  <TableCell className="font-medium text-white">
                    <div className="flex items-center gap-2 md:gap-3">
                      <Avatar className="h-6 w-6 md:h-8 md:w-8 bg-white/10">
                        {team.teamPhoto?.url ? (
                          <img src={team.teamPhoto.url} alt={team.teamName} />
                        ) : (
                          <span className="text-xs md:text-sm">{team.teamName[0]}</span>
                        )}
                      </Avatar>
                      <span className="text-xs md:text-sm whitespace-nowrap">{team.teamName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-white text-xs md:text-sm">
                    {team.wins}
                  </TableCell>
                  <TableCell className="text-center text-white text-xs md:text-sm">
                    {team.ties}
                  </TableCell>
                  <TableCell className="text-center text-white text-xs md:text-sm">
                    {team.losses}
                  </TableCell>
                  <TableCell className="text-center text-white text-xs md:text-sm">
                    {team.goalsFor}
                  </TableCell>
                  <TableCell className="text-center text-white text-xs md:text-sm">
                    {team.goalsAgainst}
                  </TableCell>
                  <TableCell className="text-center text-white text-xs md:text-sm">
                    {team.pins}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}