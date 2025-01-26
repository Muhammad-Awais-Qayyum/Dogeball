"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTimeSelected: (hours: number, minutes: number) => void;
  match: any;
  date: Date | null;
}

export function TimePickerModal({
  open,
  onOpenChange,
  onTimeSelected,
  match,
  date,
}: TimePickerModalProps) {
  const [selectedHour, setSelectedHour] = useState("9");
  const [selectedMinute, setSelectedMinute] = useState("00");

  const handleConfirm = () => {
    onTimeSelected(parseInt(selectedHour), parseInt(selectedMinute));
  };

  if (!match || !date) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/10 text-white sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Schedule Match</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Match</p>
            <p className="font-medium">
              {match.homeTeam} vs {match.awayTeam}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-400">Date</p>
            <p className="font-medium">{format(date, "MMMM d, yyyy")}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Hour</label>
              <Select
                value={selectedHour}
                onValueChange={setSelectedHour}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem
                      key={i}
                      value={i.toString()}
                      className="text-white hover:bg-white/5"
                    >
                      {i.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-400">Minute</label>
              <Select
                value={selectedMinute}
                onValueChange={setSelectedMinute}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/10">
                  {["00", "15", "30", "45"].map((minute) => (
                    <SelectItem
                      key={minute}
                      value={minute}
                      className="text-white hover:bg-white/5"
                    >
                      :{minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Schedule Match
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}