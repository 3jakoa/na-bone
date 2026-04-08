"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/discover");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col justify-center">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <img src="/mascot.svg" alt="Na Bone mascot" className="w-24 h-24 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold">Boni Buddy</CardTitle>
          <CardDescription>Prijavi se v svoj račun</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Študentski e-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="ime.priimek@student.uni-lj.si"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Geslo</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full bg-brand hover:bg-brand-dark rounded-full" disabled={loading}>
              {loading ? "Prijavljam..." : "Prijava"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Nimaš računa?{" "}
              <Link href="/auth/signup" className="text-brand hover:underline font-medium">
                Registracija
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
