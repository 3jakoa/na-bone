"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RespondButton({ boneId }: { boneId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function respond() {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("respond_to_public_bone", {
      p_bone_id: boneId,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Match ustvarjen!");
    router.push(`/matches/${data as string}`);
  }

  return (
    <Button
      onClick={respond}
      disabled={loading}
      className="bg-brand hover:bg-brand-dark w-full"
    >
      {loading ? "..." : "Odgovori in odpri chat"}
    </Button>
  );
}
