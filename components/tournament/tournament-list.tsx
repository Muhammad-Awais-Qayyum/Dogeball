"use client";

import { useState, useEffect } from "react";
import axios from "axios";
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
  const [tournaments, setTournaments] = useState<any[]>([]);
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
      const response = await axios.get("/api/get-tournament");
      if (response.data.success) {
        setTournaments(response.data.data);
      } else {
        console.error("Error fetching tournaments:", response.data.message);
        toast({
          title: "Error",
          description: "Failed to fetch tournaments",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      toast({
        title: "Error",
        description: "An error occurred while fetching tournaments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteDialog.tournamentId) {
      try {
        const response = await axios.delete("/api/delete-tournament", {
          data: { id: deleteDialog.tournamentId },
        });

        if (response.data.success) {
          setTournaments(tournaments.filter(tournament => tournament._id !== deleteDialog.tournamentId));
          setDeleteDialog({ isOpen: false, tournamentId: null });
          toast({
            title: "Success",
            description: response.data.message,
          });
        } else {
          console.error("Error deleting tournament:", response.data.message);
          toast({
            title: "Error",
            description: response.data.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error deleting tournament:", error);
        toast({
          title: "Error",
          description: "An error occurred while deleting the tournament.",
          variant: "destructive",
        });
      }
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
          setDeleteDialog({ isOpen, tournamentId: null })
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