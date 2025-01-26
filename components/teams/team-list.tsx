"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Search, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Tournament {
  _id: string;
  tournamentName: string;
}

interface Team {
  _id: string;
  teamName: string;
  teamPhoto: {
    url: string | null;
    publicId: string | null;
  };
  tournamentId: string;
}

interface TeamListProps {
  onTeamSelect: (teamId: string | null) => void;
  selectedTeam: string | null;
  refetchTrigger?: number;
}

export function TeamList({ 
  onTeamSelect, 
  selectedTeam, 
  refetchTrigger = 0 
}: TeamListProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<{ [key: string]: Team[] }>({});
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  
  useEffect(() => {
    if (!selectedTournament) {
      onTeamSelect(null);
    }
  }, [selectedTournament, onTeamSelect]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    id: string | null;
  }>({
    isOpen: false,
    id: null,
  });

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/api/get-tournament");
        if (response.data.success) {
          setTournaments(response.data.data || []);
        } else {
          setError(response.data.message);
        }
      } catch (err) {
        setError("Failed to load tournaments");
        console.error("Error fetching tournaments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!selectedTournament) {
        setTeams({});
        return;
      }

      try {
        const response = await axios.post("/api/get-teams", {
          tournamentId: selectedTournament,
        });

        if (response.data.success) {
          setTeams(prev => ({
            ...prev,
            [selectedTournament]: response.data.data || []
          }));
        } else {
          setError(response.data.message);
        }
      } catch (err) {
        setError("Failed to load teams");
        console.error("Error fetching teams:", err);
      }
    };

    if (selectedTournament) {
      fetchTeams();
    }
  }, [selectedTournament, refetchTrigger]);

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const response = await axios.delete('/api/delete-team', {
        data: { teamId }
      });

      if (response.data.success) {
        setTeams(prev => {
          const newTeams = { ...prev };
          Object.keys(newTeams).forEach(tournamentId => {
            newTeams[tournamentId] = newTeams[tournamentId].filter(
              t => t._id !== teamId
            );
          });
          return newTeams;
        });

        if (selectedTeam === teamId) {
          onTeamSelect(null);
        }

        toast({
          title: "Success",
          description: "Team deleted successfully",
        });
      } else {
        toast({
          title: "Error",
          description: response.data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog({ isOpen: false, id: null });
    }
  };

  const filteredTournaments = tournaments.filter((tournament) =>
    tournament?.tournamentName
      ?.toLowerCase()
      .includes((searchQuery || "").toLowerCase())
  );

  if (loading && !tournaments.length) {
    return <div className="text-white">Loading tournaments...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-x-hidden px-2 sm:px-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-400 w-full"
        />
      </div>

      {/* Tournament List */}
      <div className="space-y-1">
        {filteredTournaments.map((tournament) => (
          <div key={tournament._id} className="space-y-1">
            <div
              onClick={() =>
                setSelectedTournament(
                  selectedTournament === tournament._id ? null : tournament._id
                )
              }
              className={cn(
                "flex items-center p-2 sm:p-3 rounded-lg transition-colors cursor-pointer",
                selectedTournament === tournament._id
                  ? "bg-indigo-900/50"
                  : "bg-white/5 hover:bg-white/10"
              )}
            >
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                {selectedTournament === tournament._id ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                <span className="font-medium text-white text-sm sm:text-base truncate">
                  {tournament.tournamentName}
                </span>
              </div>
            </div>

            {/* Team Items */}
            {selectedTournament === tournament._id &&
              teams[tournament._id]?.map((team) => (
                <div
                  key={team._id}
                  onClick={() => onTeamSelect(team._id)}
                  className={cn(
                    "flex items-center justify-between p-2 sm:p-3 rounded-lg ml-4 sm:ml-6 cursor-pointer",
                    selectedTeam === team._id
                      ? "bg-blue-600"
                      : "bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <Avatar className="h-6 w-6 sm:h-8 sm:w-8 bg-white/10 flex-shrink-0">
                      {team.teamPhoto?.url ? (
                        <img src={team.teamPhoto.url} alt={team.teamName} className="object-cover" />
                      ) : (
                        <span className="text-xs sm:text-sm">{team.teamName?.[0] || ""}</span>
                      )}
                    </Avatar>
                    <span className="font-medium text-white text-sm sm:text-base truncate">
                      {team.teamName}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-500 hover:bg-white/5 ml-2 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteDialog({
                        isOpen: true,
                        id: team._id,
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>
        ))}
      </div>

     
      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(isOpen) =>
          setDeleteDialog({ isOpen, id: null })
        }
      >
        <AlertDialogContent className="bg-gray-900 border-white/10 w-[95vw] max-w-md mx-auto">
        <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Delete Team
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent text-white border-white/10 hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteDialog.id) {
                  handleDeleteTeam(deleteDialog.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
