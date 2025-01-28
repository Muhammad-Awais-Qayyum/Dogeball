'use client'

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Tournament {
  _id: string;
  tournamentName: string;
  numberOfTeams: number;
  numberOfRounds: number;
  roundStatuses: boolean[];
  progress: "Not Started" | "In Progress" | "Completed";
}

interface BracketTeam {
  _id: string;
  teamName: string;
  position: number;
  originalTeamId: string;
  tournamentId: string;
  round: number;
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
}

interface Match {
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
  isCompleted: boolean;
  nextMatchId?: string;
}

interface GuestTournamentBracketProps {
  selectedTournamentId: string;
}

const BRACKET_MATCHUPS = {
  QUARTERFINAL: [
    { matchId: "R1M1", home: 1, away: 8 },
    { matchId: "R1M2", home: 4, away: 5 },
    { matchId: "R1M3", home: 3, away: 6 },
    { matchId: "R1M4", home: 2, away: 7 }
  ],
  SEMIFINAL: [
    { matchId: "R1M1", home: 1, away: 4 },
    { matchId: "R1M2", home: 2, away: 3 }
  ],
  FINAL: [
    { matchId: "R1M1", home: 1, away: 2 }
  ]
};

function getBracketType(teamCount: number): 'QUARTERFINAL' | 'SEMIFINAL' | 'FINAL' {
  if (teamCount >= 8) return 'QUARTERFINAL';
  if (teamCount >= 4) return 'SEMIFINAL';
  return 'FINAL';
}

function getRoundName(round: number, bracketType: string): string {
  if (bracketType === 'QUARTERFINAL') {
    switch (round) {
      case 1: return "Quarter-Finals";
      case 2: return "Semi-Finals";
      case 3: return "Final";
    }
  } else if (bracketType === 'SEMIFINAL') {
    switch (round) {
      case 1: return "Semi-Finals";
      case 2: return "Final";
    }
  } else {
    return "Final";
  }
  return `Round ${round}`;
}

const LoadingState = () => (
  <div className="flex items-center justify-center h-36 md:h-48">
    <div className="flex flex-col items-center gap-3 md:gap-4">
      <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-white" />
      <p className="text-white text-xs md:text-sm">Loading bracket...</p>
    </div>
  </div>
);

const NoTournamentState = () => (
  <div className="flex flex-col items-center justify-center h-36 md:h-48">
    <p className="text-gray-400 text-xs md:text-sm">Please select a tournament</p>
  </div>
);

const PlayoffsNotStartedState = () => (
  <div className="flex flex-col items-center justify-center h-36 md:h-48">
    <p className="text-base md:text-lg font-semibold text-white mb-2">Playoffs Not Started</p>
    <p className="text-gray-400 text-xs md:text-sm text-center px-4">
      The playoff bracket will be available once the regular season is complete.
    </p>
  </div>
);

export function GuestTournamentBracket({ selectedTournamentId }: GuestTournamentBracketProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPlayoffs, setHasPlayoffs] = useState(false);
  const [bracketType, setBracketType] = useState<'QUARTERFINAL' | 'SEMIFINAL' | 'FINAL'>('QUARTERFINAL');

  useEffect(() => {
    const fetchBracketData = async () => {
      if (!selectedTournamentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const tournamentResponse = await axios.get('/api/get-tournament');
        if (!tournamentResponse.data?.success) {
          throw new Error("Failed to fetch tournament data");
        }

        const tournaments: Tournament[] = tournamentResponse.data.data;
        const tournament = tournaments.find(t => t._id === selectedTournamentId);
        if (!tournament) {
          throw new Error("Tournament not found");
        }

        const playoffsStarted = tournament.roundStatuses?.some(status => status === true);
        setHasPlayoffs(playoffsStarted);

        if (!playoffsStarted) {
          setLoading(false);
          return;
        }

        const bracketResponse = await axios.get(`/api/bracket-team?tournamentId=${selectedTournamentId}`);
        if (!bracketResponse.data?.success) {
          throw new Error("Failed to fetch bracket data");
        }

        const bracketTeams: BracketTeam[] = bracketResponse.data.data;
        if (!Array.isArray(bracketTeams) || bracketTeams.length === 0) {
          setHasPlayoffs(false);
          setLoading(false);
          return;
        }

        const type = getBracketType(bracketTeams.length);
        setBracketType(type);

        const bracketMatches: Match[] = [];
        const sortedTeams = [...bracketTeams].sort((a, b) => a.position - b.position);

        // Create first round matches
        BRACKET_MATCHUPS[type].forEach((matchup, i) => {
          const homeTeam = sortedTeams.find(t => t.position === matchup.home);
          const awayTeam = sortedTeams.find(t => t.position === matchup.away);

          const homeMatchHistory = homeTeam?.matchHistory.find(m => m.round === 1);
          const awayMatchHistory = awayTeam?.matchHistory.find(m => m.round === 1);

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
            round: 1,
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
            nextMatchId: type !== 'FINAL' ? `R2M${Math.ceil((i + 1) / 2)}` : undefined
          });
        });

        // Create subsequent rounds
        const maxRounds = type === 'QUARTERFINAL' ? 3 : type === 'SEMIFINAL' ? 2 : 1;

        for (let round = 2; round <= maxRounds; round++) {
          const matchesInRound = type === 'QUARTERFINAL' && round === 2 ? 2 : 1;
          
          for (let i = 0; i < matchesInRound; i++) {
            const matchId = `R${round}M${i + 1}`;
            const previousRoundMatches = bracketMatches.filter(m => 
              m.round === round - 1 && 
              m.nextMatchId === matchId
            );

            const teamsInThisMatch = previousRoundMatches.map(match => {
              if (!match.winner) return null;
              const team = match.winner === 'home' ? match.homeTeam : match.awayTeam;
              if (!team) return null;
              return sortedTeams.find(t => t.originalTeamId === team.id);
            }).filter((team): team is BracketTeam => team !== null);

            teamsInThisMatch.sort((a, b) => a.position - b.position);

            const matchHistory = teamsInThisMatch[0]?.matchHistory.find(m => m.round === round);
            const isCompleted = Boolean(matchHistory);

            let winner: "home" | "away" | undefined;
            let homeScore: number | undefined;
            let awayScore: number | undefined;

            if (isCompleted && matchHistory) {
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
              nextMatchId: round < maxRounds ? `R${round + 1}M1` : undefined
            });
          }
        }

        setMatches(bracketMatches);
      } catch (error) {
        console.error('Error fetching tournament data:', error);
        setError(error instanceof Error ? error.message : "Unable to load tournament bracket");
      } finally {
        setLoading(false);
      }
    };

    fetchBracketData();
  }, [selectedTournamentId]);

  const rounds = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  if (!selectedTournamentId) {
    return (
      <Card className="bg-white/10 border-white/10">
        <CardContent className="p-4 md:p-6">
          <NoTournamentState />
        </CardContent>
      </Card>
    );
  }

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
        ) : !hasPlayoffs ? (
          <PlayoffsNotStartedState />
        ) : matches.length === 0 ? (
          <Alert variant="destructive" className="bg-orange-500/10 border-orange-500/20">
            <AlertDescription className="text-orange-400 text-sm md:text-base">
              No bracket data available
            </AlertDescription>
          </Alert>
        ) : (
          <div className="overflow-x-auto -mx-2 md:mx-0">
            <div className="min-w-[800px] md:min-w-[1000px] pb-4 md:pb-8">
              <div className="flex gap-4 md:gap-8">
                {Object.entries(rounds).map(([round, matches]) => (
                  <div key={round} className="flex-1 space-y-3 md:space-y-4">
                    <h3 className="text-base md:text-lg font-semibold text-blue-400 text-center mb-4 md:mb-8">
                      {getRoundName(parseInt(round), bracketType)}
                    </h3>
                    <div className="space-y-4 md:space-y-8">
                      {matches.sort((a, b) => a.position - b.position).map((match, matchIndex) => (
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