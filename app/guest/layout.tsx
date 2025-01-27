"use client";

import { useRouter } from "next/navigation";
import { Trophy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";


export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleSignOut = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-black to-black">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-blue-500" />
              <span className="text-xl font-semibold text-white">
                3 Pin Dodgeball
              </span>
            </div>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-white/5"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}