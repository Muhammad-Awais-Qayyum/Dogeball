"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { MapPin, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";

interface Team {
  _id: string;
  teamName: string;
  teamPhoto: {
    url: string | null;
    publicId: string | null;
  };
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
  venue?: string;
}

export function NextMatch() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);

  useEffect(() => {
    const fetchNextMatch = async () => {
      try {
        setLoading(true);
        setError(null);

        const matchesResponse = await fetch("/api/get-all-scheduled-matches", {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!matchesResponse.ok) {
          throw new Error('Failed to fetch matches');
        }

        const matchesData = await matchesResponse.json();
        
        if (matchesData.success) {
          const matches = matchesData.data;
          const upcomingMatch = matches.find((match: Match) => 
            match.status === 'scheduled' || match.status === 'in_progress'
          );

          if (upcomingMatch) {
            setNextMatch(upcomingMatch);

            const [homeTeamRes, awayTeamRes] = await Promise.all([
              fetch("/api/get-teams", {
                method: 'POST',
                cache: 'no-store',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ teamId: upcomingMatch.homeTeamId })
              }),
              fetch("/api/get-teams", {
                method: 'POST',
                cache: 'no-store',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ teamId: upcomingMatch.awayTeamId })
              })
            ]);

            if (!homeTeamRes.ok || !awayTeamRes.ok) {
              throw new Error('Failed to fetch team data');
            }

            const [homeTeamData, awayTeamData] = await Promise.all([
              homeTeamRes.json(),
              awayTeamRes.json()
            ]);

            if (homeTeamData.success) {
              setHomeTeam(homeTeamData.data);
            }
            if (awayTeamData.success) {
              setAwayTeam(awayTeamData.data);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching next match:", error);
        setError("Failed to load match data");
      } finally {
        setLoading(false);
      }
    };

    fetchNextMatch();
  }, []);

  if (loading) {
    return (
      <Card className="bg-white/10 border-white/10">
        <CardContent className="flex items-center justify-center h-36 md:h-48">
          <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-blue-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white/10 border-white/10">
        <CardContent className="p-4 md:p-6">
          <div className="text-red-400 text-sm md:text-base">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!nextMatch || !homeTeam || !awayTeam) {
    return (
      <Card className="bg-white/10 border-white/10">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-white text-lg md:text-xl">Next Match</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="text-white text-center text-sm md:text-base">No upcoming matches scheduled</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 border-white/10">
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-white text-lg md:text-xl">Next Match</CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
            {/* Home Team */}
            <div className="flex items-center gap-3 md:gap-4">
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

            {/* VS */}
            <div className="text-xl md:text-2xl font-bold text-white">VS</div>

            {/* Away Team */}
            <div className="flex items-center gap-3 md:gap-4">
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
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-400 text-sm md:text-base">
              <Clock className="h-4 w-4" />
              <span>
                {format(new Date(nextMatch.scheduledDate), "MMMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <span 
              className={`inline-flex items-center rounded-full px-2 md:px-2.5 py-0.5 text-xs md:text-sm font-medium ${
                nextMatch.status === 'in_progress' 
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-blue-500/10 text-blue-500'
              }`}
            >
              {nextMatch.status === 'in_progress' ? 'In Progress' : 'Upcoming'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default NextMatch;