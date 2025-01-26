"use client";

import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface TournamentSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function TournamentSelect({ value, onValueChange }: TournamentSelectProps) {
  // Mock data - replace with real data from your backend
  const tournaments = [
    { id: "1", name: "Summer Championship 2024", status: "In Progress" },
    { id: "2", name: "Spring Tournament", status: "Completed" },
    { id: "3", name: "Winter League", status: "Upcoming" },
  ];

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="bg-white/5 border-white/10 text-white">
        <SelectValue placeholder="Select tournament" />
      </SelectTrigger>
      <SelectContent className="bg-gray-900 border-white/10">
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tournaments..."
              className="pl-8 bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>
        {tournaments.map((tournament) => (
          <SelectItem
            key={tournament.id}
            value={tournament.id}
            className="text-white hover:bg-white/5"
          >
            <div className="flex items-center justify-between">
              <span>{tournament.name}</span>
              <span className="text-sm text-blue-400">
                {tournament.status}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}