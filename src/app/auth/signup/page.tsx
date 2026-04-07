"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { STUDENT_EMAIL_DOMAINS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function isStudentEmail(email: string): boolean {
  return STUDENT_EMAIL_DOMAINS.some((domain) => email.toLowerCase().endsWith(`@${domain}`));
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!isStudentEmail(email)) {
      setError(`Registracija je možna samo s študentskim e-mailom (${STUDENT_EMAIL_DOMAINS.join(", ")})`);
      return;
    }

    if (password !== confirm) {
      setError("Gesli se ne ujemata.");
      return;
    }

    if (password.length < 8) {
      setError("Geslo mora imeti vsaj 8 znakov.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="text-4xl mb-2">📧</div>
            <CardTitle>Preveri e-mail</CardTitle>
            <CardDescription>
              Poslali smo ti potrditveno sporočilo na <strong>{email}</strong>.
              Klikni na povezavo v e-mailu, da aktiviraš račun.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">🍽️</div>
          <CardTitle className="text-2xl font-bold">Na Bone</CardTitle>
          <CardDescription>Ustvari račun s študentskim e-mailom</CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
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
              <p className="text-xs text-muted-foreground">
                Podprte domene: {STUDENT_EMAIL_DOMAINS.join(", ")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Geslo</Label>
              <Input
                id="password"
                type="password"
                placeholder="Vsaj 8 znakov"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Ponovi geslo</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full bg-brand hover:bg-brand-dark rounded-full" disabled={loading}>
              {loading ? "Ustvarjam račun..." : "Registracija"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Že imaš račun?{" "}
              <Link href="/auth/login" className="text-brand hover:underline font-medium">
                Prijava
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
