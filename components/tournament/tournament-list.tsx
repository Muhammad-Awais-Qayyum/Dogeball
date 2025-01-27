"use client";

import { useState, useEffect } from "react";
import { Eye, Trash2, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

interface Tournament {
  _id: string;
  tournamentName: string;
  numberOfTeams: number;
  numberOfRounds: number;
  progress: string;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[50vh] sm:min-h-[60vh] lg:min-h-[70vh] w-full px-4">
    <div className="flex flex-col items-center gap-3 sm:gap-4">
      <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-white" />
      <p className="text-white text-sm sm:text-base text-center">Loading tournaments...</p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="col-span-full flex flex-col items-center justify-center min-h-[50vh] sm:min-h-[60vh] lg:min-h-[70vh] px-4">
    <h1 className="text-xl sm:text-2xl font-semibold text-white mb-2 text-center">
      No Active Tournaments
    </h1>
    <p className="text-gray-400 text-sm sm:text-base text-center max-w-md mx-auto">
      Create a new tournament to get started.
    </p>
  </div>
);

export function TournamentList() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    tournamentId: string | null;
  }>({
    isOpen: false,
    tournamentId: null,
  });

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/get-tournament", { cache: 'no-store' });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setTournaments(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch tournaments");
      }
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch tournaments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.tournamentId) return;

    try {
      const response = await fetch("/api/delete-tournament", {
        method: "DELETE",
        cache: 'no-store',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: deleteDialog.tournamentId }),
      });
      
      const data = await response.json();

      if (response.ok && data.success) {
        setTournaments((prev) => 
          prev.filter(tournament => tournament._id !== deleteDialog.tournamentId)
        );
        toast({
          title: "Success",
          description: data.message || "Tournament deleted successfully",
        });
      } else {
        throw new Error(data.message || "Failed to delete tournament");
      }
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete tournament",
        variant: "destructive",
      });
    } finally {
      setDeleteDialog({ isOpen: false, tournamentId: null });
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 p-2 sm:p-0">
      {tournaments.length === 0 ? (
        <EmptyState />
      ) : (
        tournaments.map((tournament) => (
          <Card 
            key={tournament._id} 
            className="bg-white/10 border-white/10 transition-transform hover:scale-[1.02] duration-200"
          >
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl text-white line-clamp-1">
                {tournament.tournamentName}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-gray-400">
                {tournament.numberOfTeams} Teams • {tournament.numberOfRounds} Rounds
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-blue-400 font-medium">
                  {tournament.progress}
                </span>
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 text-gray-400 hover:text-red-500 hover:bg-white/5"
                    onClick={() =>
                      setDeleteDialog({
                        isOpen: true,
                        tournamentId: tournament._id,
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(isOpen) =>
          setDeleteDialog({ isOpen, tournamentId: isOpen ? deleteDialog.tournamentId : null })
        }
      >
        <AlertDialogContent className="bg-gray-900 border-white/10 max-w-[90vw] sm:max-w-lg w-full p-6 sm:p-8">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-xl sm:text-2xl text-white">
              Delete Tournament
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base text-gray-400">
              Are you sure you want to delete this tournament? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 sm:mt-8 gap-3 sm:gap-4">
            <AlertDialogCancel className="bg-transparent text-white border-white/10 hover:bg-white/5 text-sm sm:text-base">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-sm sm:text-base"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}