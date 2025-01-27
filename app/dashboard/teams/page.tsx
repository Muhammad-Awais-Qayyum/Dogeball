"use client";

import { useState, useEffect } from "react";
import { TeamList } from "@/components/teams/team-list";
import { TeamEditor } from "@/components/teams/team-editor";
import { Loader2 } from "lucide-react";

const LoadingState = () => (
  <div className="flex items-center justify-center min-h-[92vh]">
    <div className="flex flex-col items-center gap-4 p-4">
      <Loader2 className="h-8 w-8 animate-spin text-white" />
      <p className="text-white text-sm text-center">Loading tournaments...</p>
    </div>
  </div>
);

const NoTournamentsState = () => (
  <div className="flex flex-col items-center justify-center min-h-[92vh] p-4">
    <h1 className="text-xl font-semibold text-white mb-2 text-center">No Tournaments Available</h1>
    <p className="text-gray-400 text-sm text-center">Create a tournament to get started.</p>
  </div>
);

const NoTeamSelectedState = () => (
  <div className="flex flex-col items-center justify-center min-h-[92vh] p-4">
    <h1 className="text-xl font-semibold text-white mb-2 text-center">No Team Selected</h1>
    <p className="text-gray-400 text-sm text-center">Select a team from the list to view and edit details.</p>
  </div>
);

export default function TeamsPage() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [hasTournaments, setHasTournaments] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const checkTournaments = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/get-tournament", {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch tournaments');
        }

        setHasTournaments(data.success && data.data?.length > 0);
      } catch (error) {
        setError("Failed to load tournaments");
        console.error("Error checking tournaments:", error);
      } finally {
        setLoading(false);
      }
    };

    checkTournaments();
  }, []);

  const handleRefetch = () => setRefetchTrigger(prev => prev + 1);

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[92vh] p-4">
        <p className="text-red-500 text-sm text-center">{error}</p>
      </div>
    );
  }
  if (!hasTournaments) return <NoTournamentsState />;

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 p-4">
      {/* Team List - Full width on mobile, sidebar on desktop */}
      <div className="w-full lg:w-80">
        <TeamList 
          onTeamSelect={setSelectedTeam} 
          selectedTeam={selectedTeam}
          refetchTrigger={refetchTrigger}
        />
      </div>

      {/* Team Editor - Full width on both mobile and desktop */}
      <div className="flex-1">
        {selectedTeam ? (
          <TeamEditor 
            teamId={selectedTeam} 
            onTeamUpdated={handleRefetch}
          />
        ) : (
          <NoTeamSelectedState />
        )}
      </div>
    </div>
  );
}