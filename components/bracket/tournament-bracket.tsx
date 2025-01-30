"use client";

import { useMemo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Constants for match configurations based on tournament stage
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

// Interfaces for type safety
export interface BracketTeam {
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
  matchHistory: {
    round: number;
    opponent: string;
    score: number;
    opponentScore: number;
    won: boolean;
    _id: string;
  }[];
  stats: {
    wins: number;
    losses: number;
    ties: number;
    goalsFor: number;
    goalsAgainst: number;
    pins: number;
  };
}

export interface Match {
  id: string;
  round: number;
  position: number;
  homeTeam: {
    id: string;
    name: string;
    seed: number;
    score?: number;
  } | null;
  awayTeam: {
    id: string;
    name: string;
    seed: number;
    score?: number;
  } | null;
  winner?: "home" | "away";
  isPlayable: boolean;
  isCompleted: boolean;
  nextMatchId?: string;
}

interface TournamentBracketProps {
  onMatchClick: (match: Match) => void;
  tournamentId?: string;
  roundStatuses?: boolean[];
}

// Helper Components
const NoTeamsState = () => (
  <div className="flex flex-col items-center justify-center h-[79vh]">
    <h1 className="text-xl font-semibold text-white mb-2">No Teams Available</h1>
    <p className="text-gray-400 text-sm">Complete all rounds to generate the tournament bracket.</p>
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

// Main Component
export function TournamentBracket({
  onMatchClick,
  tournamentId,
  roundStatuses = []
}: TournamentBracketProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalTeams, setTotalTeams] = useState<number>(0);

  // Helper function to check round completion
  const isRoundCompleted = (round: number, matches: Match[]): boolean => {
    const roundMatches = matches.filter(m => m.round === round);
    return roundMatches.every(m => m.isCompleted);
  };

  // Helper function to determine match playability
  const determineMatchPlayability = (match: Match, allMatches: Match[]): boolean => {
    const { totalTeams } = determineBracketParameters(allMatches);

    if (totalTeams <= 2) return !match.isCompleted;
    
    if (totalTeams <= 4) {
      if (match.round === 2) return true;
      if (match.round === 3) {
        return isRoundCompleted(2, allMatches) && !match.isCompleted;
      }
    }

    if (match.round === 1) return true;
    if (match.round === 2) {
      return isRoundCompleted(1, allMatches) && !match.isCompleted;
    }
    if (match.round === 3) {
      return isRoundCompleted(1, allMatches) &&
        isRoundCompleted(2, allMatches) &&
        !match.isCompleted;
    }

    return false;
  };

  // Helper function to determine bracket parameters
  const determineBracketParameters = (matches: Match[]) => {
    const teamsInMatches = new Set();
    matches.forEach(match => {
      if (match.homeTeam) teamsInMatches.add(match.homeTeam.id);
      if (match.awayTeam) teamsInMatches.add(match.awayTeam.id);
    });
    return { totalTeams: teamsInMatches.size };
  };

  // Fetch bracket data
  useEffect(() => {
    const fetchBracketData = async () => {
      if (!tournamentId) return;

      try {
        const response = await axios.get(`/api/bracket-team?tournamentId=${tournamentId}`);

        if (response.data.success) {
          const bracketTeams: BracketTeam[] = response.data.data;

          if (!bracketTeams.length) {
            setError("No teams available");
            return;
          }

          setTotalTeams(bracketTeams.length);

          const {
            matchupConfig,
            initialRound,
            finalRound
          } = determineInitialRoundAndConfig(bracketTeams.length);

          // Create bracket matches
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
              isPlayable: true,
              isCompleted,
              nextMatchId: initialRound < finalRound ? 
                `R${initialRound + 1}M${Math.ceil((i + 1) / 2)}` : undefined
            });
          });

          // Create subsequent round matches
          if (bracketTeams.length > 2) {
            for (let round = initialRound + 1; round <= finalRound; round++) {
              const matchesInRound = round === finalRound ? 1 : 2;

              for (let i = 0; i < matchesInRound; i++) {
                const matchId = `R${round}M${i + 1}`;
                let teamsInThisMatch = [];

                // Find teams for this match from previous round winners
                const previousRoundMatches = bracketMatches.filter(m =>
                  m.round === round - 1 &&
                  m.nextMatchId === matchId
                );

                teamsInThisMatch = previousRoundMatches
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

                // Get match history if available
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
                  isPlayable: determineMatchPlayability({
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
                    isPlayable: true
                  }, bracketMatches),
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
        setError("No teams available");
      }
    };

    fetchBracketData();
  }, [tournamentId, roundStatuses]);

  // Organize matches by rounds
  const rounds = useMemo(() => {
    const { totalTeams } = determineBracketParameters(matches);
    
    // Group matches by round
    const roundsMap = matches.reduce((acc, match) => {
      if (totalTeams <= 2 && match.round !== 3) return acc;
      if (totalTeams <= 4 && match.round === 1) return acc;
      
      if (!acc[match.round]) {
        acc[match.round] = [];
      }
      acc[match.round].push(match);
      return acc;
    }, {} as Record<number, Match[]>);

    // Convert to array and sort matches within each round
    return Object.entries(roundsMap)
      .map(([round, matches]) => ({
        name: getRoundName(parseInt(round), totalTeams),
        matches: matches.sort((a, b) => a.position - b.position),
      }));
  }, [matches]);

  if (error) {
    return <NoTeamsState />;
  }

  // Render tournament bracket
  return (
    <div className="flex gap-8 overflow-x-auto">
      {rounds.map((round, roundIndex) => (
        <div key={roundIndex} className="flex-1 space-y-4 min-w-[300px]">
          <h3 className="text-lg font-semibold text-blue-400 text-center mb-8">
            {round.name}
          </h3>
          <div className="space-y-8">
            {round.matches.map((match, matchIndex) => (
              <div
                key={match.id}
                className={cn(
                  "relative",
                  matchIndex !== round.matches.length - 1 &&
                  "after:absolute after:top-[calc(100%+1rem)] after:left-1/2 after:w-px after:h-16 after:bg-white/10"
                )}
              >
                <button
                  onClick={() => onMatchClick(match)}
                  disabled={!match.isPlayable || match.isCompleted}
                  className={cn(
                    "w-full text-left rounded-lg border transition-colors",
                    match.isPlayable && !match.isCompleted
                      ? "cursor-pointer hover:border-blue-500/50 hover:bg-white/5"
                      : "cursor-not-allowed opacity-50",
                    match.isCompleted
                      ? "bg-green-500/10 border-green-500/20"
                      : "bg-white/5 border-white/10"
                  )}
                >
                  {/* Home Team */}
                  {/* Home Team */}
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 border-b",
                      match.winner === "home" 
                        ? "border-green-500/20"
                        : "border-white/10"
                    )}
                  >
                    <div className="w-6 text-sm text-gray-400">
                      {match.homeTeam?.seed || "-"}
                    </div>
                    <div className="flex-1 font-medium text-white">
                      {match.homeTeam?.name || "TBD"}
                    </div>
                    <div
                      className={cn(
                        "w-6 text-right",
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
                      "flex items-center gap-3 p-3",
                      match.winner === "away" && "bg-green-500/5"
                    )}
                  >
                    <div className="w-6 text-sm text-gray-400">
                      {match.awayTeam?.seed || "-"}
                    </div>
                    <div className="flex-1 font-medium text-white">
                      {match.awayTeam?.name || "TBD"}
                    </div>
                    <div
                      className={cn(
                        "w-6 text-right",
                        match.winner === "away"
                          ? "text-green-500 font-bold"
                          : "text-white"
                      )}
                    >
                      {match.awayTeam?.score ?? "-"}
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}