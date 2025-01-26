"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TournamentList } from "@/components/tournament/tournament-list";
import { CreateTournamentDialog } from "@/components/tournament/create-tournament-dialog";

export default function DashboardPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:justify-between sm:items-center">
        <h1 className="text-2xl sm:text-2xl md:text-3xl font-bold text-white text-center sm:text-left">
          Your Tournaments
        </h1>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm md:text-base py-2 h-auto"
        >
          <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
          Create Tournament
        </Button>
      </div>

      <TournamentList />
      
      <CreateTournamentDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}