"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Message, Bone, RestaurantInfo } from "@/lib/supabase/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Utensils, Check, X, Star, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatScheduledDate } from "@/lib/formatDate";

type InviteCard = {
  type: "bone_invite";
  bone_id: string;
  restaurant: string;
  restaurant_address?: string | null;
  restaurant_city?: string | null;
  restaurant_rating?: number | null;
  restaurant_supplement?: number | null;
  restaurant_meal_price?: number | null;
  scheduled_at: string;
  note: string | null;
};

function parseInviteCard(content: string): InviteCard | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "bone_invite") return parsed;
  } catch {}
  return null;
}

interface Props {
  matchId: string;
  myProfile: Profile;
  otherProfile: Profile;
  initialMessages: Message[];
  activeBone: Bone | null;
}

export default function ChatView({ matchId, myProfile, otherProfile, initialMessages, activeBone: initialBone }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [activeBone, setActiveBone] = useState<Bone | null>(initialBone);
  const [boneStatuses, setBoneStatuses] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [boneOpen, setBoneOpen] = useState(false);
  const [boneRestaurant, setBoneRestaurant] = useState("");
  const [boneDate, setBoneDate] = useState("");
  const [boneNote, setBoneNote] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.background = "white";
    return () => {
      document.body.style.overflow = "";
      document.body.style.background = "";
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch bone statuses for invite cards
  useEffect(() => {
    const unknownIds = messages
      .map((m) => parseInviteCard(m.content))
      .filter((inv): inv is InviteCard => inv !== null)
      .map((inv) => inv.bone_id)
      .filter((id) => !(id in boneStatuses));
    if (unknownIds.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("meal_invites")
        .select("id, status")
        .in("id", unknownIds);
      if (data) {
        setBoneStatuses((prev) => {
          const next = { ...prev };
          for (const b of data) next[b.id] = b.status;
          return next;
        });
      }
    })();
  }, [messages]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meal_invites", filter: `match_id=eq.${matchId}` },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const bone = payload.new as Bone;
            setBoneStatuses((prev) => ({ ...prev, [bone.id]: bone.status }));
            if (bone.status === "accepted") {
              setActiveBone(bone);
            } else if (bone.status === "open") {
              setActiveBone((prev) => prev ?? bone);
            } else {
              setActiveBone((prev) => prev?.id === bone.id ? null : prev);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);

    const { data, error } = await supabase.from("chat_messages").insert({
      match_id: matchId,
      sender_id: myProfile.id,
      content: text.trim(),
    }).select().single();

    if (error) {
      toast.error("Napaka pri pošiljanju.");
    } else {
      setText("");
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev;
        return [...prev, data as Message];
      });
    }
    setSending(false);
  }

  async function proposeBone() {
    if (!boneRestaurant.trim() || !boneDate) {
      toast.error("Izpolni restavracijo in datum.");
      return;
    }

    const scheduledAt = new Date(boneDate).toISOString();

    const { data: bone, error } = await supabase.from("meal_invites").insert({
      user_id: myProfile.id,
      match_id: matchId,
      restaurant: boneRestaurant.trim(),
      restaurant_info: null,
      scheduled_at: scheduledAt,
      note: boneNote.trim() || null,
      status: "open",
      visibility: "private",
    }).select("id").single();

    if (error) { toast.error(error.message); return; }

    // Send invite card message
    await supabase.from("chat_messages").insert({
      match_id: matchId,
      sender_id: myProfile.id,
      content: JSON.stringify({
        type: "bone_invite",
        bone_id: bone.id,
        restaurant: boneRestaurant.trim(),
        scheduled_at: scheduledAt,
        note: boneNote.trim() || null,
      }),
    });

    setBoneOpen(false);
    setBoneRestaurant("");
    setBoneDate("");
    setBoneNote("");
    toast.success("Povabilo poslano!");
  }

  async function respondToInvite(boneId: string, response: "accepted" | "declined") {
    const { error } = await (supabase.rpc as any)("respond_to_bone_invite", {
      p_bone_id: boneId,
      p_response: response,
    });
    if (error) { toast.error(error.message); return; }
    setBoneStatuses((prev) => ({ ...prev, [boneId]: response }));

    if (response === "accepted") {
      const { data: bone } = await supabase
        .from("meal_invites")
        .select("*")
        .eq("match_id", matchId)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveBone(bone ?? null);
    }
  }

  async function respondToBoneBanner(accept: boolean) {
    if (!activeBone) return;
    await respondToInvite(activeBone.id, accept ? "accepted" : "declined");
    if (!accept) setActiveBone(null);
  }

  const isBoneProposedByMe = activeBone?.user_id === myProfile.id;

  return (
    <div className="flex flex-col overflow-hidden w-full max-w-lg mx-auto bg-white" style={{ height: "calc(100dvh - 4rem)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white shrink-0">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={otherProfile.photos[0]} />
          <AvatarFallback>{otherProfile.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{otherProfile.name}</div>
          <div className="text-xs text-muted-foreground truncate">{otherProfile.faculty}</div>
        </div>
        {!activeBone && (
          <Button
            size="sm"
            onClick={() => setBoneOpen(true)}
            className="bg-brand hover:bg-brand-dark gap-1 shrink-0"
          >
            <Utensils className="w-4 h-4" />
            Na bone
          </Button>
        )}
      </div>

      {/* Active bone banner */}
      {activeBone && (
        <div className="bg-brand-light rounded-2xl mx-4 mb-2 px-4 py-3 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-semibold text-brand-dark text-sm">
                <Utensils className="w-4 h-4 shrink-0" />
                {activeBone.status === "accepted" ? "Dogovorjeno!" : "Povabilo na bone"}
              </div>
              <div className="text-sm text-brand-dark mt-0.5 truncate">
                {activeBone.restaurant} · {formatScheduledDate(activeBone.scheduled_at)}
              </div>
              {activeBone.note && <div className="text-xs text-brand mt-0.5 truncate">{activeBone.note}</div>}
            </div>
            {activeBone.status === "open" && !isBoneProposedByMe && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => respondToBoneBanner(true)}
                  className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200"
                >
                  <Check className="w-4 h-4 text-green-600" />
                </button>
                <button
                  onClick={() => respondToBoneBanner(false)}
                  className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            )}
            {activeBone.status === "accepted" && (
              <Badge className="bg-green-100 text-green-700 border-0 shrink-0">Potrjeno ✓</Badge>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-sm pt-8 text-brand/60">
            Match z {otherProfile.name}! Pošlji sporočilo ali predlagaj bone 🍽️
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === myProfile.id;
          const invite = parseInviteCard(msg.content);

          if (invite) {
            const status = boneStatuses[invite.bone_id];
            return (
              <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className="max-w-[85%] bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  {/* Restaurant */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <Utensils className="w-4 h-4 text-brand shrink-0" />
                    <span className="font-semibold text-gray-900">{invite.restaurant}</span>
                    {invite.restaurant_rating != null && invite.restaurant_rating > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span className="text-xs font-semibold">{invite.restaurant_rating}</span>
                      </span>
                    )}
                  </div>
                  {(invite.restaurant_address || invite.restaurant_city) && (
                    <div className="flex items-center gap-1 ml-5.5 mb-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {[invite.restaurant_address, invite.restaurant_city].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  {invite.restaurant_supplement != null && (
                    <div className="flex items-center gap-2 ml-5.5 mb-1">
                      <span className="text-xs font-semibold text-green-600">
                        {Number(invite.restaurant_supplement).toFixed(2)} EUR doplačilo
                      </span>
                    </div>
                  )}
                  {/* Date */}
                  <div className="flex items-center gap-1 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">{formatScheduledDate(invite.scheduled_at)}</span>
                  </div>
                  {invite.note && (
                    <p className="text-xs text-gray-600 mt-1">{invite.note}</p>
                  )}
                  {/* Status / Actions */}
                  {status === "accepted" ? (
                    <div className="mt-2 bg-green-50 rounded-lg py-1.5 text-center">
                      <span className="text-green-600 font-semibold text-xs">Sprejeto</span>
                    </div>
                  ) : status === "declined" ? (
                    <div className="mt-2 bg-red-50 rounded-lg py-1.5 text-center">
                      <span className="text-red-500 font-semibold text-xs">Zavrnjeno</span>
                    </div>
                  ) : !isMe ? (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => respondToInvite(invite.bone_id, "accepted")}
                        className="flex-1 bg-brand text-white rounded-lg py-1.5 text-xs font-semibold hover:bg-brand-dark"
                      >
                        Sprejmi
                      </button>
                      <button
                        onClick={() => respondToInvite(invite.bone_id, "declined")}
                        className="flex-1 bg-gray-100 text-gray-600 rounded-lg py-1.5 text-xs font-semibold hover:bg-gray-200"
                      >
                        Zavrni
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 bg-blue-50 rounded-lg py-1.5 text-center">
                      <span className="text-brand font-semibold text-xs">Čaka na odgovor</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-4 py-2 text-sm break-words",
                  isMe
                    ? "bg-brand text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-900 rounded-bl-sm"
                )}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-3 bg-white shrink-0">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Sporočilo..."
          className="flex-1 rounded-[20px]"
        />
        <Button type="submit" size="icon" disabled={sending || !text.trim()} className="bg-brand hover:bg-brand-dark shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {/* Bone proposal dialog */}
      <Dialog open={boneOpen} onOpenChange={setBoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Predlagaj bone z {otherProfile.name} 🍽️</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Restavracija / lokal</Label>
              <Input
                value={boneRestaurant}
                onChange={(e) => setBoneRestaurant(e.target.value)}
                placeholder="Npr. Pr' Skelet, Döner Kebab Center..."
              />
            </div>
            <div className="space-y-2">
              <Label>Datum in čas</Label>
              <Input
                type="datetime-local"
                value={boneDate}
                onChange={(e) => setBoneDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="space-y-2">
              <Label>Opomba (neobvezno)</Label>
              <Textarea
                value={boneNote}
                onChange={(e) => setBoneNote(e.target.value)}
                placeholder="Npr. jaz plačam kavo 😄"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBoneOpen(false)}>Prekliči</Button>
            <Button onClick={proposeBone} className="bg-brand hover:bg-brand-dark">
              Pošlji povabilo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
