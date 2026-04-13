"use client";

import { useState, useEffect, useRef } from "react";
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

type Restaurant = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  supplement_price: number | null;
  meal_price: number | null;
  rating: number | null;
};

export default function CreatePublicBoneButton({ myProfileId }: { myProfileId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("restaurants")
      .select("id, name, city, address, supplement_price, meal_price, rating")
      .order("name")
      .then(({ data }) => {
        if (data) setRestaurants(data as Restaurant[]);
      });
  }, [open]);

  const q = search.toLowerCase();
  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      (r.city && r.city.toLowerCase().includes(q)) ||
      (r.address && r.address.toLowerCase().includes(q))
  );

  async function submit() {
    if (!restaurant || !date) {
      toast.error("Izpolni restavracijo in datum.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("meal_invites").insert({
      user_id: myProfileId,
      match_id: null,
      restaurant: restaurant.name,
      restaurant_info: {
        address: restaurant.address,
        city: restaurant.city,
        rating: restaurant.rating,
        supplement_price: restaurant.supplement_price,
        meal_price: restaurant.meal_price,
      },
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
    setRestaurant(null); setSearch(""); setDate(""); setNote("");
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
          <DialogTitle>Objavi javni bone</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Restavracija / lokal</Label>
            <div className="relative" ref={dropdownRef}>
              {restaurant ? (
                <div className="bg-muted rounded-md px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold">{restaurant.name}</span>
                      {restaurant.rating != null && restaurant.rating > 0 && (
                        <span className="text-amber-500 text-xs font-semibold">
                          {"★".repeat(restaurant.rating)}{"☆".repeat(5 - restaurant.rating)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setRestaurant(null); setSearch(""); setShowDropdown(true); }}
                      className="text-muted-foreground hover:text-foreground text-sm px-2 py-1 -mr-1 rounded hover:bg-accent transition-colors"
                    >
                      Spremeni
                    </button>
                  </div>
                  {(restaurant.address || restaurant.city) && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {[restaurant.address, restaurant.city].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {restaurant.supplement_price != null && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-green-600">
                        {Number(restaurant.supplement_price).toFixed(2)} EUR doplačilo
                      </span>
                      {restaurant.meal_price != null && (
                        <span className="text-xs text-muted-foreground">
                          (cena obroka {Number(restaurant.meal_price).toFixed(2)})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Išči restavracijo..."
                  />
                  {showDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                      {filtered.slice(0, 50).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                          onClick={() => {
                            setRestaurant(r);
                            setSearch("");
                            setShowDropdown(false);
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{r.name}</span>
                            {r.rating != null && r.rating > 0 && (
                              <span className="text-amber-500 text-xs font-semibold">
                                {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{[r.address, r.city].filter(Boolean).join(", ")}</span>
                            {r.supplement_price != null && (
                              <span className="text-green-600 font-semibold">
                                {Number(r.supplement_price).toFixed(2)} EUR dopl.
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                      {filtered.length === 0 && search.length > 0 && (
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm text-brand font-medium"
                          onClick={() => {
                            setRestaurant({
                              id: "custom",
                              name: search.trim(),
                              city: null,
                              address: null,
                              supplement_price: null,
                              meal_price: null,
                              rating: null,
                            });
                            setSearch("");
                            setShowDropdown(false);
                          }}
                        >
                          + Dodaj &quot;{search.trim()}&quot;
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
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
