"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GuestHeader() {
  return (
    <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-blue-500" />
            <span className="text-lg font-semibold text-white">
              3 Pin Dodgeball
            </span>
          </div>

          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}