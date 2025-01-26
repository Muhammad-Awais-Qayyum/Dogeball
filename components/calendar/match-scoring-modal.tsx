"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Minus, Plus, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MatchScoringModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    start: Date;
    status?: 'scheduled' | 'in_progress' | 'completed';
    homeTeamPhoto?: {
      url: string | null;
    };
    awayTeamPhoto?: {
      url: string | null;
    };
  };
  onScoreSubmit: (scores: {
    homeScore: number;
    awayScore: number;
    homePins: number;
    awayPins: number;
    status: 'completed';
  }) => void;
}

export function MatchScoringModal({
  open,
  onOpenChange,
  match,
  onScoreSubmit,
}: MatchScoringModalProps) {
  const [scores, setScores] = useState({
    homeScore: 0,
    awayScore: 0,
    homePins: 0,
    awayPins: 0,
  });

  const handleScoreChange = (team: "home" | "away", change: number) => {
    setScores((prev) => ({
      ...prev,
      [`${team}Score`]: Math.max(0, prev[`${team}Score`] + change),
    }));
  };

  const handlePinChange = (team: "home" | "away", change: number) => {
    setScores((prev) => ({
      ...prev,
      [`${team}Pins`]: Math.max(0, Math.min(9, prev[`${team}Pins`] + change)),
    }));
  };

  const handleReset = () => {
    setScores({
      homeScore: 0,
      awayScore: 0,
      homePins: 0,
      awayPins: 0,
    });
  };

  const handleSubmit = () => {
    onScoreSubmit({
      ...scores,
      status: 'completed'
    });
    onOpenChange(false);
  };

  if (!match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5 text-blue-500" />
            <span>Match Score</span>
          </DialogTitle>
          <div className="text-center text-sm text-gray-400">
            {format(new Date(match.start), "MMMM d, yyyy • HH:mm")}
          </div>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Score Section */}
          <div className="grid grid-cols-2 gap-8">
            {/* Home Team */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-white/10">
                  <AvatarImage 
                    src={match.homeTeamPhoto?.url || ''} 
                    alt={match.homeTeam} 
                  />
                  <AvatarFallback>{match.homeTeam[0]}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{match.homeTeam}</span>
              </div>
              <div className="bg-white/5 rounded-lg p-6 text-center">
                <div className="text-6xl font-bold mb-4">
                  {scores.homeScore}
                </div>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleScoreChange("home", -1)}
                    className="h-10 w-10 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleScoreChange("home", 1)}
                    className="h-10 w-10 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Away Team */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 justify-end">
                <span className="font-medium">{match.awayTeam}</span>
                <Avatar className="h-10 w-10 bg-white/10">
                  <AvatarImage 
                    src={match.awayTeamPhoto?.url || ''} 
                    alt={match.awayTeam} 
                  />
                  <AvatarFallback>{match.awayTeam[0]}</AvatarFallback>
                </Avatar>
              </div>
              <div className="bg-white/5 rounded-lg p-6 text-center">
                <div className="text-6xl font-bold mb-4">
                  {scores.awayScore}
                </div>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleScoreChange("away", -1)}
                    className="h-10 w-10 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleScoreChange("away", 1)}
                    className="h-10 w-10 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Pin Tracker Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Pin Tracker</h3>
            <div className="grid grid-cols-2 gap-8">
              {/* Home Team Pins */}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-center mb-2">
                  <span className="text-sm text-gray-400">
                    {match.homeTeam} Pins
                  </span>
                </div>
                <div className="text-4xl font-bold text-center mb-3">
                  {scores.homePins}
                </div>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePinChange("home", -1)}
                    className="h-8 w-8 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePinChange("home", 1)}
                    className="h-8 w-8 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Away Team Pins */}
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-center mb-2">
                  <span className="text-sm text-gray-400">
                    {match.awayTeam} Pins
                  </span>
                </div>
                <div className="text-4xl font-bold text-center mb-3">
                  {scores.awayPins}
                </div>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePinChange("away", -1)}
                    className="h-8 w-8 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePinChange("away", 1)}
                    className="h-8 w-8 rounded-full border-white/10 hover:bg-white/5 text-black bg-white hover:text-black"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-white/10 bg-white text-black hover:bg-white/90"
            >
              Reset
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Submit Match Score
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}