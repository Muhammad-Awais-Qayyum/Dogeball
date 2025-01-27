"use client";

import { useState, useEffect } from "react";
import { TournamentBracket } from "@/components/bracket/tournament-bracket";
import { BracketControls } from "@/components/bracket/bracket-controls";
import { MatchScoringDialog } from "@/components/bracket/match-scoring-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import axios from "axios";

export interface BracketTeam {
  _id: string;
  teamName: string;
  position: number;
  originalTeamId: string;
  tournamentId: string;
  stats: {
    wins: number;
    losses: number;
    ties: number;
    goalsFor: number;
    goalsAgainst: number;
    pins: number;
  };
}

export interface Tournament {
  _id: string;
  tournamentName: string;
  numberOfTeams: number;
  numberOfRounds: number;
  roundStatuses: boolean[];
  progress: "In Progress" | "Completed";
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

interface ScoreSubmission {
  homeScore: number;
  awayScore: number;
}

const LoadingState = () => (
  <div className="flex items-center justify-center h-screen px-4">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
      <p className="text-white text-sm text-center">Loading bracket...</p>
    </div>
  </div>
);

const NoTournamentsState = () => (
  <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
    <h1 className="text-xl font-semibold text-white mb-2">
      No Tournaments Available
    </h1>
    <p className="text-gray-400 text-sm">
      Create a tournament to get started.
    </p>
  </div>
);

export default function BracketPage() {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasTournaments, setHasTournaments] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkTournaments = async () => {
      try {
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const response = await axios.get("/api/get-tournament");
        if (response.data.success && response.data.data.length > 0) {
          setHasTournaments(true);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to check tournaments.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkTournaments();
  }, [toast]);

  const refreshTournamentData = async () => {
    if (!selectedTournament) return;

    try {
      const response = await axios.get("/api/get-tournament");
      if (response.data.success) {
        const updatedTournament = response.data.data.find(
          (t: Tournament) => t._id === selectedTournament._id
        );
        if (updatedTournament) {
          setSelectedTournament(updatedTournament);
          setRefreshKey((prev) => prev + 1);
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh tournament data.",
        variant: "destructive",
      });
    }
  };

  const handleTournamentSelect = (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setRefreshKey((prev) => prev + 1);
  };

  const handleMatchClick = (match: Match) => {
    if (!match.homeTeam || !match.awayTeam) {
      toast({
        title: "Match not available",
        description: "This match is not ready yet.",
        variant: "destructive",
      });
      return;
    }

    if (!match.isPlayable) {
      toast({
        title: "Match not available",
        description: "Previous round matches must be completed first.",
        variant: "destructive",
      });
      return;
    }

    setSelectedMatch(match);
  };

  const handleScoreSubmit = async (matchId: string, scores: ScoreSubmission) => {
    if (!selectedMatch) return;

    try {
      const matchResponse = await axios.put(
        `/api/update-bracket-score/${matchId}`,
        {
          homeTeam: selectedMatch.homeTeam,
          awayTeam: selectedMatch.awayTeam,
          homeScore: scores.homeScore,
          awayScore: scores.awayScore,
          homePins: 0,
          awayPins: 0,
        }
      );

      if (!matchResponse.data.success) {
        throw new Error(matchResponse.data.message || "Failed to update match scores");
      }

      toast({
        title: "Success",
        description: "Match scores have been updated successfully.",
      });

      await refreshTournamentData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update match scores.",
        variant: "destructive",
      });
    } finally {
      setSelectedMatch(null);
    }
  };

  if (loading) return <LoadingState />;
  if (!hasTournaments) return <NoTournamentsState />;

  return (
    <div className="container mx-auto max-w-7xl space-y-4 sm:space-y-6 lg:space-y-8 p-3 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white text-center">
          Tournament Bracket
        </h1>
        <div className="w-full sm:w-auto">
          <BracketControls onTournamentSelect={handleTournamentSelect} />
        </div>
      </div>

      <div className="relative  overflow-x-auto  pb-4 sm:pb-6 lg:pb-8">
        <div className="min-w-[320px] w-full lg:min-w-[960px] xl:min-w-[1150px]  ">
          {selectedTournament && (
            <TournamentBracket
              key={refreshKey}
              onMatchClick={handleMatchClick}
              tournamentId={selectedTournament._id}
              roundStatuses={selectedTournament.roundStatuses}
            />
          )}
        </div>
      </div>

      <MatchScoringDialog
        match={selectedMatch}
        open={!!selectedMatch}
        onOpenChange={(open) => !open && setSelectedMatch(null)}
        onScoreSubmit={handleScoreSubmit}
      />
    </div>
  );
}