"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

export default function LoginPage() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/login', {
        email,
        password
      });

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Login successful",
        });
        
        // Small delay to ensure cookie is set
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh(); // Force refresh to update navigation state
        }, 100);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Login failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    router.push("/guest");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-black to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="flex justify-center">
            <Trophy className="h-12 w-12 text-blue-500" />
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
            3 Pin Dodgeball
          </h2>
          <p className="mt-2 text-sm text-blue-200">
            Enter your credentials to login
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-white/10 text-black bg-white hover:bg-white/90"
              onClick={handleGuestLogin}
            >
              Continue as Guest
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}