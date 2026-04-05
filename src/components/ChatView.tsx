"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Message, Bone } from "@/lib/supabase/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Utensils, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [boneOpen, setBoneOpen] = useState(false);
  const [boneRestaurant, setBoneRestaurant] = useState("");
  const [boneDate, setBoneDate] = useState("");
  const [boneNote, setBoneNote] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bones", filter: `match_id=eq.${matchId}` },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const bone = payload.new as Bone;
            if (bone.status === "open" || bone.status === "accepted") {
              setActiveBone(bone);
            } else {
              setActiveBone(null);
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

    const { data, error } = await supabase.from("messages").insert({
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

    const { error } = await supabase.from("bones").insert({
      user_id: myProfile.id,
      match_id: matchId,
      restaurant: boneRestaurant.trim(),
      scheduled_at: new Date(boneDate).toISOString(),
      note: boneNote.trim() || null,
      status: "open",
    });

    if (error) { toast.error(error.message); return; }

    // Send a system-style message
    await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: myProfile.id,
      content: `🍽️ Predlagam: ${boneRestaurant} — ${new Date(boneDate).toLocaleString("sl-SI")}${boneNote ? ` · ${boneNote}` : ""}`,
    });

    setBoneOpen(false);
    setBoneRestaurant("");
    setBoneDate("");
    setBoneNote("");
    toast.success("Povabilo poslano!");
  }

  async function respondToBone(accept: boolean) {
    if (!activeBone) return;
    const newStatus = accept ? "accepted" : "declined";

    const { error } = await supabase
      .from("bones")
      .update({ status: newStatus })
      .eq("id", activeBone.id);

    if (error) { toast.error(error.message); return; }

    await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: myProfile.id,
      content: accept
        ? `✅ Sprejeto! Se vidimo v ${activeBone.restaurant}.`
        : `❌ Žal ne morem tokrat.`,
    });

    if (!accept) setActiveBone(null);
  }

  const isBoneProposedByMe = activeBone?.user_id === myProfile.id;

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={otherProfile.photos[0]} />
          <AvatarFallback>{otherProfile.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="font-semibold">{otherProfile.name}</div>
          <div className="text-xs text-muted-foreground">{otherProfile.faculty}</div>
        </div>
        {!activeBone && (
          <Button
            size="sm"
            onClick={() => setBoneOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 gap-1"
          >
            <Utensils className="w-4 h-4" />
            Na bone
          </Button>
        )}
      </div>

      {/* Active bone banner */}
      {activeBone && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-orange-700 text-sm">
                <Utensils className="w-4 h-4" />
                {activeBone.status === "accepted" ? "Dogovorjeno!" : "Povabilo na bone"}
              </div>
              <div className="text-sm text-orange-600 mt-0.5">
                {activeBone.restaurant} · {new Date(activeBone.scheduled_at).toLocaleString("sl-SI")}
              </div>
              {activeBone.note && <div className="text-xs text-orange-500 mt-0.5">{activeBone.note}</div>}
            </div>
            {activeBone.status === "open" && !isBoneProposedByMe && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => respondToBone(true)}
                  className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200"
                >
                  <Check className="w-4 h-4 text-green-600" />
                </button>
                <button
                  onClick={() => respondToBone(false)}
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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm pt-8">
            Match z {otherProfile.name}! Pošlji sporočilo ali predlagaj bone 🍽️
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === myProfile.id;
          return (
            <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                  isMe
                    ? "bg-orange-500 text-white rounded-br-sm"
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
      <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-3 border-t bg-white">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Sporočilo..."
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={sending || !text.trim()} className="bg-orange-500 hover:bg-orange-600 shrink-0">
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
            <Button onClick={proposeBone} className="bg-orange-500 hover:bg-orange-600">
              Pošlji povabilo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
