"use client";

import { useEffect, useState } from "react";
import axios from "axios";
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
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
 
        const matchesResponse = await axios.get("/api/get-all-scheduled-matches", {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
 
        if (matchesResponse.data.success) {
          const upcomingMatch = matchesResponse.data.data.find((match: Match) => 
            match.status === 'scheduled' || match.status === 'in_progress'
          );
 
          if (upcomingMatch) {
            setNextMatch(upcomingMatch);
 
            const [homeTeamRes, awayTeamRes] = await Promise.all([
              axios.post("/api/get-teams", 
                { teamId: upcomingMatch.homeTeamId },
                {
                  headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
                  }
                }
              ),
              axios.post("/api/get-teams", 
                { teamId: upcomingMatch.awayTeamId },
                {
                  headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Pragma': 'no-cache'
                  }
                }
              )
            ]);
 
            if (homeTeamRes.data.success && awayTeamRes.data.success) {
              setHomeTeam(homeTeamRes.data.data);
              setAwayTeam(awayTeamRes.data.data);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching match data:', error);
        setError("Failed to load match data");
      } finally {
        setLoading(false);
      }
    };
 
    fetchData();
  }, []);
 
  

  if (loading) {
    return (
      <Card className="bg-white/10 border-white/10">
        <CardContent className="flex flex-col items-center justify-center h-36 md:h-48 gap-2">
          <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-blue-400" />
          <p className="text-gray-400 text-sm">Loading match details...</p>
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
          <div className="text-white text-center text-sm md:text-base">
            No upcoming matches scheduled
          </div>
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
            <div className="flex items-center gap-3 md:gap-4">
              <Avatar className="h-10 w-10 md:h-12 md:w-12 bg-white/10">
                {homeTeam.teamPhoto?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
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

            <div className="flex items-center gap-3 md:gap-4">
              <div className="text-right">
                <p className="text-base md:text-lg font-semibold text-white">
                  {awayTeam.teamName}
                </p>
              </div>
              <Avatar className="h-10 w-10 md:h-12 md:w-12 bg-white/10">
                {awayTeam.teamPhoto?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
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