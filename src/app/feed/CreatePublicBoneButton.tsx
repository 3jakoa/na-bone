"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function CreatePublicBoneButton({ myProfileId }: { myProfileId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [restaurant, setRestaurant] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!restaurant.trim() || !date) {
      toast.error("Izpolni restavracijo in datum.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("bones").insert({
      user_id: myProfileId,
      match_id: null,
      restaurant: restaurant.trim(),
      scheduled_at: new Date(date).toISOString(),
      note: note.trim() || null,
      status: "open",
      visibility: "public",
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    setRestaurant(""); setDate(""); setNote("");
    toast.success("Javni bone objavljen!");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-brand hover:bg-brand-dark gap-1 shrink-0">
          <Plus className="w-4 h-4" /> Nov
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Objavi javni bone 🍽️</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Restavracija / lokal</Label>
            <Input
              value={restaurant}
              onChange={(e) => setRestaurant(e.target.value)}
              placeholder="Npr. Pr' Skelet..."
            />
          </div>
          <div className="space-y-2">
            <Label>Datum in čas</Label>
            <Input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          <div className="space-y-2">
            <Label>Opomba (neobvezno)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Npr. iščem družbo za kosilo"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Prekliči</Button>
          <Button onClick={submit} disabled={saving} className="bg-brand hover:bg-brand-dark">
            {saving ? "..." : "Objavi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
