"use client";

import { useMemo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const QUARTERFINAL_MATCHUPS = [
  { matchId: "R1M1", home: 1, away: 8 },
  { matchId: "R1M2", home: 4, away: 5 },
  { matchId: "R1M3", home: 3, away: 6 },
  { matchId: "R1M4", home: 2, away: 7 },
];

export interface BracketTeam {
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

const NoTeamsState = () => (
  <div className="flex flex-col items-center justify-center h-[79vh]">
    <h1 className="text-xl font-semibold text-white mb-2">No Teams Available</h1>
    <p className="text-gray-400 text-sm">Add teams to generate the tournament bracket.</p>
  </div>
);

function getRoundName(round: number): string {
  switch (round) {
    case 1:
      return "Quarter-Finals";
    case 2:
      return "Semi-Finals";
    case 3:
      return "Final";
    default:
      return `Round ${round}`;
  }
}

export function TournamentBracket({
  onMatchClick,
  tournamentId,
  roundStatuses = []
}: TournamentBracketProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Helper function to check if a round is completed
  const isRoundCompleted = (round: number, matches: Match[]): boolean => {
    const roundMatches = matches.filter(m => m.round === round);
    return roundMatches.every(m => m.isCompleted);
  };

  // Helper function to determine match playability
  const determineMatchPlayability = (match: Match, allMatches: Match[]): boolean => {
    if (match.round === 1) return true;
    
    const previousRoundCompleted = isRoundCompleted(match.round - 1, allMatches);
    const currentRoundIncomplete = !isRoundCompleted(match.round, allMatches);
    
    if (match.round === 2) {
      return previousRoundCompleted && currentRoundIncomplete;
    }
    
    if (match.round === 3) {
      const quarterFinalsCompleted = isRoundCompleted(1, allMatches);
      const semiFinalsCompleted = isRoundCompleted(2, allMatches);
      return quarterFinalsCompleted && semiFinalsCompleted && currentRoundIncomplete;
    }
    
    return false;
  };

  useEffect(() => {
    const fetchBracketData = async () => {
      if (!tournamentId) return;

      try {
        const response = await fetch(`/api/bracket-team?tournamentId=${tournamentId}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch bracket data');
        }

        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch bracket data');
        }

        const bracketTeams: BracketTeam[] = data.data;

        if (!bracketTeams.length) {
          setError("No teams available");
          return;
        }

        const bracketMatches: Match[] = [];
        const sortedTeams = [...bracketTeams].sort((a, b) => a.position - b.position);

        // Create quarterfinal matches
        QUARTERFINAL_MATCHUPS.forEach((matchup, i) => {
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
            isPlayable: true,
            isCompleted,
            nextMatchId: `R2M${Math.ceil((i + 1) / 2)}`
          });
        });

        // Create subsequent rounds (semifinals and finals)
        for (let round = 2; round <= 3; round++) {
          const matchesInRound = round === 2 ? 2 : 1;
          
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
              return bracketTeams.find(t => t.originalTeamId === team.id);
            }).filter((team): team is BracketTeam => team !== null);

            teamsInThisMatch.sort((a, b) => a.position - b.position);

            const matchHistory = teamsInThisMatch[0]?.matchHistory.find(m => m.round === round);
            const isCompleted = Boolean(matchHistory);

            let winner: "home" | "away" | undefined;
            let homeScore: number | undefined;
            let awayScore: number | undefined;

            if (isCompleted) {
              homeScore = matchHistory!.score;
              awayScore = matchHistory!.opponentScore;
              winner = matchHistory!.won ? "home" : "away";
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
              isPlayable: false,
              isCompleted,
              nextMatchId: round < 3 ? `R${round + 1}M1` : undefined
            });
          }
        }

        bracketMatches.forEach(match => {
          match.isPlayable = determineMatchPlayability(match, bracketMatches);
        });

        setMatches(bracketMatches);
        setError(null);
      } catch (error) {
        console.error('Error fetching bracket data:', error);
        setError("No teams available");
      }
    };

    fetchBracketData();
  }, [tournamentId, roundStatuses]);

  const rounds = useMemo(() => {
    const roundsMap = matches.reduce((acc, match) => {
      if (!acc[match.round]) {
        acc[match.round] = [];
      }
      acc[match.round].push(match);
      return acc;
    }, {} as Record<number, Match[]>);

    return Object.entries(roundsMap).map(([round, matches]) => ({
      name: getRoundName(parseInt(round)),
      matches: matches.sort((a, b) => a.position - b.position),
    }));
  }, [matches]);

  if (error) {
    return <NoTeamsState />;
  }

  return (
    <div className="flex gap-8">
      {rounds.map((round, roundIndex) => (
        <div
          key={roundIndex}
          className="flex-1 space-y-4"
        >
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