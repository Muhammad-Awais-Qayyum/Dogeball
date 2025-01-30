"use client";

import { useMemo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Constants for tournament structure
const MATCHUP_CONFIGS = {
  FINALS: [
    { matchId: "R3M1", home: 1, away: 2 }
  ],
  SEMIFINALS: [
    { matchId: "R2M1", home: 1, away: 4 },
    { matchId: "R2M2", home: 2, away: 3 }
  ],
  QUARTERFINALS: [
    { matchId: "R1M1", home: 1, away: 8 },
    { matchId: "R1M2", home: 4, away: 5 },
    { matchId: "R1M3", home: 3, away: 6 },
    { matchId: "R1M4", home: 2, away: 7 }
  ]
};

// Type definitions with improved clarity
interface BracketTeam {
  _id: string;
  teamName: string;
  position: number;
  originalTeamId: string;
  tournamentId: string;
  round: number;
  stage: string;
  isEliminated: boolean;
  score: number;
  nextMatchId?: string;
  matchHistory: MatchHistory[];
  stats: TeamStats;
}

interface MatchHistory {
  round: number;
  opponent: string;
  score: number;
  opponentScore: number;
  won: boolean;
  _id: string;
}

interface TeamStats {
  wins: number;
  losses: number;
  ties: number;
  goalsFor: number;
  goalsAgainst: number;
  pins: number;
}

interface Match {
  id: string;
  round: number;
  position: number;
  homeTeam: TeamDisplay | null;
  awayTeam: TeamDisplay | null;
  winner?: "home" | "away";
  isCompleted: boolean;
  nextMatchId?: string;
}

interface TeamDisplay {
  id: string;
  name: string;
  seed: number;
  score?: number;
}

interface GuestTournamentBracketProps {
  selectedTournamentId: string;
}

// Helper components for different states
const LoadingState = () => (
  <div className="flex items-center justify-center h-36 md:h-48">
    <div className="flex flex-col items-center gap-3 md:gap-4">
      <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-white" />
      <p className="text-white text-xs md:text-sm">Loading bracket...</p>
    </div>
  </div>
);

const NoTeamsState = () => (
  <div className="flex flex-col items-center justify-center h-36 md:h-48">
    <p className="text-gray-400 text-xs md:text-sm">The playoffs haven't started yet. Check back later for tournament updates.</p>
  </div>
);

// Helper functions
function getRoundName(round: number, totalTeams: number): string {
  if (totalTeams <= 2) return "Final";
  if (totalTeams <= 4) {
    return round === 2 ? "Semi-Finals" : "Final";
  }
  switch (round) {
    case 1: return "Quarter-Finals";
    case 2: return "Semi-Finals";
    case 3: return "Final";
    default: return `Round ${round}`;
  }
}

function determineInitialRoundAndConfig(totalTeams: number) {
  // This determines which rounds to display based on team count
  if (totalTeams <= 2) {
    return {
      matchupConfig: MATCHUP_CONFIGS.FINALS,
      initialRound: 3,
      finalRound: 3
    };
  }
  if (totalTeams <= 4) {
    return {
      matchupConfig: MATCHUP_CONFIGS.SEMIFINALS,
      initialRound: 2,
      finalRound: 3
    };
  }
  return {
    matchupConfig: MATCHUP_CONFIGS.QUARTERFINALS,
    initialRound: 1,
    finalRound: 3
  };
}

// Main component
export function GuestTournamentBracket({ selectedTournamentId }: GuestTournamentBracketProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTeams, setTotalTeams] = useState<number>(0);

  useEffect(() => {
    const fetchBracketData = async () => {
      if (!selectedTournamentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(`/api/bracket-team?tournamentId=${selectedTournamentId}`);

        if (response.data.success) {
          const bracketTeams: BracketTeam[] = response.data.data;

          if (!bracketTeams.length) {
            setError("No teams available");
            setLoading(false);
            return;
          }

          // Process bracket data
          setTotalTeams(bracketTeams.length);
          const { matchupConfig, initialRound, finalRound } =
            determineInitialRoundAndConfig(bracketTeams.length);

          // Create matches array
          const bracketMatches: Match[] = [];
          const sortedTeams = [...bracketTeams].sort((a, b) => a.position - b.position);

          // Create initial round matches
          matchupConfig.forEach((matchup, i) => {
            const homeTeam = sortedTeams.find(t => t.position === matchup.home);
            const awayTeam = sortedTeams.find(t => t.position === matchup.away);

            const homeMatchHistory = homeTeam?.matchHistory.find(m => m.round === initialRound);
            const awayMatchHistory = awayTeam?.matchHistory.find(m => m.round === initialRound);

            const isCompleted = Boolean(homeMatchHistory || awayMatchHistory);
            let winner: "home" | "away" | undefined;
            let homeScore: number | undefined;
            let awayScore: number | undefined;

            if (isCompleted && homeMatchHistory) {
              homeScore = homeMatchHistory.score;
              awayScore = homeMatchHistory.opponentScore;
              winner = homeMatchHistory.won ? "home" : "away";
            } else if (isCompleted && awayMatchHistory) {
              homeScore = awayMatchHistory.opponentScore;
              awayScore = awayMatchHistory.score;
              winner = awayMatchHistory.won ? "away" : "home";
            }

            bracketMatches.push({
              id: matchup.matchId,
              round: initialRound,
              position: i + 1,
              homeTeam: homeTeam ? {
                id: homeTeam.originalTeamId,
                name: homeTeam.teamName,
                seed: homeTeam.position,
                score: homeScore
              } : null,
              awayTeam: awayTeam ? {
                id: awayTeam.originalTeamId,
                name: awayTeam.teamName,
                seed: awayTeam.position,
                score: awayScore
              } : null,
              winner,
              isCompleted,
              nextMatchId: initialRound < finalRound ?
                `R${initialRound + 1}M${Math.ceil((i + 1) / 2)}` : undefined
            });
          });

          // Create subsequent rounds
          if (bracketTeams.length > 2) {
            for (let round = initialRound + 1; round <= finalRound; round++) {
              const matchesInRound = round === finalRound ? 1 : 2;

              for (let i = 0; i < matchesInRound; i++) {
                const matchId = `R${round}M${i + 1}`;

                // Find teams from previous round
                const previousRoundMatches = bracketMatches.filter(m =>
                  m.round === round - 1 &&
                  m.nextMatchId === matchId
                );

                const teamsInThisMatch = previousRoundMatches
                  .map(match => {
                    if (!match.winner) return null;
                    const team = match.winner === 'home' ?
                      match.homeTeam : match.awayTeam;
                    if (!team) return null;
                    return bracketTeams.find(t =>
                      t.originalTeamId === team.id
                    );
                  })
                  .filter((team): team is BracketTeam => team !== null);

                const matchHistory = teamsInThisMatch[0]?.matchHistory
                  .find(m => m.round === round);

                const isCompleted = Boolean(matchHistory);
                let winner: "home" | "away" | undefined;
                let homeScore: number | undefined;
                let awayScore: number | undefined;

                if (matchHistory) {
                  homeScore = matchHistory.score;
                  awayScore = matchHistory.opponentScore;
                  winner = matchHistory.won ? "home" : "away";
                }

                bracketMatches.push({
                  id: matchId,
                  round,
                  position: i + 1,
                  homeTeam: teamsInThisMatch[0] ? {
                    id: teamsInThisMatch[0].originalTeamId,
                    name: teamsInThisMatch[0].teamName,
                    seed: teamsInThisMatch[0].position,
                    score: homeScore
                  } : null,
                  awayTeam: teamsInThisMatch[1] ? {
                    id: teamsInThisMatch[1].originalTeamId,
                    name: teamsInThisMatch[1].teamName,
                    seed: teamsInThisMatch[1].position,
                    score: awayScore
                  } : null,
                  winner,
                  isCompleted,
                  nextMatchId: round < finalRound ? `R${round + 1}M1` : undefined
                });
              }
            }
          }

          setMatches(bracketMatches);
          setError(null);
        }
      } catch (error) {
        console.error('Error fetching bracket data:', error);
        setError(error instanceof Error ? error.message : "Unable to load bracket");
      } finally {
        setLoading(false);
      }
    };

    fetchBracketData();
  }, [selectedTournamentId]);

  const rounds = useMemo(() => {
    const roundsMap = matches.reduce((acc, match) => {
      if (totalTeams <= 2 && match.round !== 3) return acc;
      if (totalTeams <= 4 && match.round === 1) return acc;

      if (!acc[match.round]) {
        acc[match.round] = [];
      }
      acc[match.round].push(match);
      return acc;
    }, {} as Record<number, Match[]>);

    return Object.entries(roundsMap)
      .map(([round, matches]) => ({
        name: getRoundName(parseInt(round), totalTeams),
        matches: matches.sort((a, b) => a.position - b.position),
      }));
  }, [matches, totalTeams]);

  // Render component
  return (
    <Card className="bg-white/10 border-white/10">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-xl md:text-2xl text-white">Tournament Bracket</CardTitle>
      </CardHeader>
      <CardContent className="p-2 md:p-6">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
            <AlertDescription className="text-red-400 text-sm md:text-base">
              {error}
            </AlertDescription>
          </Alert>
        ) : matches.length === 0 ? (
          <NoTeamsState />
        ) : (
          <div className="overflow-x-auto -mx-2 md:mx-0">
            <div className="min-w-[800px] md:min-w-[1000px] pb-4 md:pb-8">
              <div className="flex gap-4 md:gap-8">
                {rounds.map(({ name, matches }, roundIndex) => (
                  <div key={roundIndex} className="flex-1 space-y-3 md:space-y-4">
                    <h3 className="text-base md:text-lg font-semibold text-blue-400 text-center mb-4 md:mb-8">
                      {name}
                    </h3>
                    <div className="space-y-4 md:space-y-8">
                      {matches.map((match, matchIndex) => (
                        <div
                          key={match.id}
                          className={cn(
                            "relative",
                            matchIndex !== matches.length - 1 &&
                            "after:absolute after:top-[calc(100%+0.75rem)] md:after:top-[calc(100%+1rem)] after:left-1/2 after:w-px after:h-12 md:after:h-16 after:bg-white/10"
                          )}
                        >
                          <div
                            className={cn(
                              "w-full text-left rounded-lg border",
                              match.isCompleted
                                ? "bg-green-500/10 border-green-500/20"
                                : "bg-white/5 border-white/10"
                            )}
                          >
                            {/* Home Team */}
                            <div
                              className={cn(
                                "flex items-center gap-2 md:gap-3 p-2 md:p-3 border-b text-sm md:text-base",
                                match.winner === "home"
                                  ? "border-green-500/20"
                                  : "border-white/10"
                              )}
                            >
                              <div className="w-5 md:w-6 text-xs md:text-sm text-gray-400">
                                {match.homeTeam?.seed || "-"}
                              </div>
                              <div className="flex-1 font-medium text-white truncate">
                                {match.homeTeam?.name || "TBD"}
                              </div>
                              <div
                                className={cn(
                                  "w-5 md:w-6 text-right",
                                  match.winner === "home"
                                    ? "text-green-500 font-bold"
                                    : "text-white"
                                )}
                              >
                                {match.homeTeam?.score ?? "-"}
                              </div>
                            </div>

                            {/* Away Team */}
                            <div
                              className={cn(
                                "flex items-center gap-2 md:gap-3 p-2 md:p-3 text-sm md:text-base",
                                match.winner === "away" && "bg-green-500/5"
                              )}
                            >
                              <div className="w-5 md:w-6 text-xs md:text-sm text-gray-400">
                                {match.awayTeam?.seed || "-"}
                              </div>
                              <div className="flex-1 font-medium text-white truncate">
                                {match.awayTeam?.name || "TBD"}
                              </div>
                              <div
                                className={cn(
                                  "w-5 md:w-6 text-right",
                                  match.winner === "away"
                                    ? "text-green-500 font-bold"
                                    : "text-white"
                                )}
                              >
                                {match.awayTeam?.score ?? "-"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}