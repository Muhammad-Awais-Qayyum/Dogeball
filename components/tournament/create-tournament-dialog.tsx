"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreateTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTournamentDialog({
  open,
  onOpenChange,
}: CreateTournamentDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    teamCount: "",
    rounds: "",
    teams: ["", ""],
  });
  const [loading, setLoading] = useState(false);

  const handleAddTeam = () => {
    setFormData((prev) => ({
      ...prev,
      teams: [...prev.teams, ""],
    }));
  };

  const handleRemoveTeam = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      teams: prev.teams.filter((_, i) => i !== index),
    }));
  };

  const handleTeamNameChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      teams: prev.teams.map((team, i) => (i === index ? value : team)),
    }));
  };

  const handleSubmit = async () => {
    const { name, teamCount, rounds, teams } = formData;
  
    // Frontend validation
    if (!name || !teamCount || !rounds) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
  
    // Validate empty team names
    if (teams.some((team) => !team)) {
      toast({
        title: "Validation Error",
        description: "Please provide names for all teams.",
        variant: "destructive",
      });
      return;
    }
  
    // Validate number of teams matches selected team count
    if (teams.length !== parseInt(teamCount)) {
      toast({
        title: "Team Count Mismatch",
        description: `Please add exactly ${teamCount} teams. Currently you have ${teams.length} teams.`,
        variant: "destructive",
      });
      return;
    }
  
    const payload = {
      tournamentName: name,
      numberOfTeams: parseInt(teamCount),
      numberOfRounds: parseInt(rounds),
      teams,
    };
  
    try {
      setLoading(true);
      const response = await fetch("/api/create-tournament", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create tournament");
      }

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "Tournament created successfully",
        });
  
        // Reset form data
        setFormData({
          name: "",
          teamCount: "",
          rounds: "",
          teams: ["", ""],
        });
  
        // Close the dialog
        onOpenChange(false);
  
        // Refresh the page
        window.location.reload();
      } else {
        throw new Error(data.message || "Failed to create tournament");
      }
    } catch (error) {
      console.error("Error creating tournament:", error);
  
      if (!navigator.onLine) {
        toast({
          title: "Network Error",
          description: "Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to create tournament",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Tournament</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Tournament Name</label>
            <Input
              placeholder="Enter tournament name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Number of Teams</label>
              <Select
                value={formData.teamCount}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, teamCount: value }))
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                    <SelectItem
                      key={num}
                      value={num.toString()}
                      className="text-white hover:bg-white/5"
                    >
                      {num} {num === 1 ? "Team" : "Teams"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Number of Rounds</label>
              <Select
                value={formData.rounds}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, rounds: value }))
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <SelectItem
                      key={num}
                      value={num.toString()}
                      className="text-white hover:bg-white/5"
                    >
                      {num} {num === 1 ? "Round" : "Rounds"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm text-gray-400">Teams</label>
            <div 
              className={cn(
                "space-y-2",
                formData.teams.length > 2 && "max-h-[150px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-white/5 pl-2 pt-2 pb-2 pr-2"
              )}
            >
              {formData.teams.map((team, index) => (
                <div key={index} className="flex gap-3">
                  <Input
                    placeholder={`Team ${index + 1}`}
                    value={team}
                    onChange={(e) => handleTeamNameChange(index, e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  {index >= 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTeam(index)}
                      className="text-gray-400 hover:text-red-500 hover:bg-white/5"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddTeam}
              className="border-white/10 bg-white text-black hover:bg-white/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/5"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Tournament"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}