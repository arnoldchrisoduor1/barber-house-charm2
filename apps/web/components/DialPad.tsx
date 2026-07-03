"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  Building2,
  Clock,
  Delete,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneOff,
  Play,
  Star,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CallState = "idle" | "dialing" | "ringing" | "connected" | "on_hold" | "ended";

type SpeedDialContact = {
  name: string;
  number: string;
  branch: string;
  role: string;
};

const speedDialContacts: SpeedDialContact[] = [
  { name: "Grace Wanjiku", number: "+254 712 345 678", branch: "Westlands", role: "VIP Client" },
  { name: "David Kamau", number: "+254 700 888 999", branch: "Westlands", role: "Senior Barber" },
  { name: "Faith Njeri", number: "+254 711 222 333", branch: "Karen", role: "Receptionist" },
];

const recentCalls = [
  { name: "Grace Wanjiku", number: "+254 712 345 678", time: "2 min ago", type: "outbound" as const },
  { name: "Unknown", number: "+254 733 444 555", time: "22 min ago", type: "missed" as const },
];

const KEYS = [
  { digit: "1", sub: "" },
  { digit: "2", sub: "ABC" },
  { digit: "3", sub: "DEF" },
  { digit: "4", sub: "GHI" },
  { digit: "5", sub: "JKL" },
  { digit: "6", sub: "MNO" },
  { digit: "7", sub: "PQRS" },
  { digit: "8", sub: "TUV" },
  { digit: "9", sub: "WXYZ" },
  { digit: "*", sub: "" },
  { digit: "0", sub: "+" },
  { digit: "#", sub: "" },
];

interface DialPadProps {
  onCallInitiated?: (number: string) => void;
  onClose?: () => void;
  initialNumber?: string;
  compact?: boolean;
}

export function DialPad({ onCallInitiated, onClose, initialNumber = "", compact = false }: DialPadProps) {
  const [number, setNumber] = useState(initialNumber);
  const [callState, setCallState] = useState<CallState>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [showSpeedDial, setShowSpeedDial] = useState(false);
  const [matchedContact, setMatchedContact] = useState<SpeedDialContact | null>(null);

  useEffect(() => {
    if (number.length >= 4) {
      const clean = number.replace(/\s/g, "");
      const found = speedDialContacts.find((c) => c.number.replace(/\s/g, "").includes(clean));
      setMatchedContact(found ?? null);
    } else {
      setMatchedContact(null);
    }
  }, [number]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (callState === "connected" || callState === "on_hold") {
      interval = setInterval(() => setCallDuration((d) => d + 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const pressKey = useCallback(
    (digit: string) => {
      if (callState === "idle" || callState === "ended") {
        setNumber((prev) => prev + digit);
      }
    },
    [callState],
  );

  const deleteDigit = () => setNumber((prev) => prev.slice(0, -1));

  const startCall = () => {
    if (!number) return;
    setCallState("dialing");
    setCallDuration(0);
    onCallInitiated?.(number);
    setTimeout(() => setCallState("ringing"), 1500);
    setTimeout(() => setCallState("connected"), 4000);
  };

  const endCall = () => {
    setCallState("ended");
    setIsMuted(false);
    setIsSpeaker(false);
    setTimeout(() => {
      setCallState("idle");
      setCallDuration(0);
    }, 2000);
  };

  const toggleHold = () => {
    setCallState((prev) => (prev === "on_hold" ? "connected" : "on_hold"));
  };

  const callFromContact = (contact: SpeedDialContact) => {
    setNumber(contact.number);
    setShowSpeedDial(false);
    setTimeout(() => startCall(), 300);
  };

  const isInCall = ["dialing", "ringing", "connected", "on_hold"].includes(callState);

  return (
    <Card className={`relative mx-auto overflow-hidden border-border/50 ${compact ? "max-w-xs" : "max-w-sm"}`} data-testid="dial-pad">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Dial Pad</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShowSpeedDial(!showSpeedDial)}>
              <Star className="mr-1 h-3.5 w-3.5" /> Speed Dial
            </Button>
            {onClose ? (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {showSpeedDial ? (
          <div className="max-h-48 overflow-y-auto border-b border-border/50 p-2">
            {speedDialContacts.map((c) => (
              <button
                key={c.number}
                type="button"
                onClick={() => callFromContact(c)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  {c.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {c.role} · {c.branch}
                  </p>
                </div>
                <Phone className="h-4 w-4 text-green-400" />
              </button>
            ))}
          </div>
        ) : null}

        {isInCall ? (
          <div
            className={`px-4 py-5 text-center ${
              callState === "on_hold" ? "bg-blue-500/10" : callState === "connected" ? "bg-green-500/5" : "bg-muted/30"
            }`}
          >
            {matchedContact ? (
              <>
                <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
                  {matchedContact.name.charAt(0)}
                </div>
                <p className="text-lg font-semibold">{matchedContact.name}</p>
                <p className="text-sm text-muted-foreground">{matchedContact.role}</p>
                <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>{matchedContact.branch}</span>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold">{number}</p>
                <p className="text-sm text-muted-foreground">Unknown Caller</p>
              </>
            )}
            <div className="mt-3">
              {callState === "dialing" ? <p className="animate-pulse text-sm text-muted-foreground">Dialing...</p> : null}
              {callState === "ringing" ? <p className="animate-pulse text-sm text-yellow-400">Ringing...</p> : null}
              {callState === "connected" ? <p className="font-mono text-sm text-green-400">{formatDuration(callDuration)}</p> : null}
              {callState === "on_hold" ? (
                <p className="animate-pulse text-sm text-blue-400">On Hold · {formatDuration(callDuration)}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {!isInCall ? (
          <div className="px-4 pb-2 pt-4">
            <div className="flex min-h-[56px] items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
              <span className={`font-mono text-xl tracking-wider ${number ? "text-foreground" : "text-muted-foreground"}`}>
                {number || "Enter number"}
              </span>
              {number ? (
                <button type="button" onClick={deleteDigit} className="rounded p-1 transition-colors hover:bg-muted">
                  <Delete className="h-5 w-5 text-muted-foreground" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {!isInCall ? (
          <div className="px-4 pb-2">
            <div className="grid grid-cols-3 gap-2">
              {KEYS.map(({ digit, sub }) => (
                <motion.button
                  key={digit}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => pressKey(digit)}
                  className="flex h-14 flex-col items-center justify-center rounded-xl bg-muted/40 transition-all hover:bg-muted/70 active:bg-muted"
                >
                  <span className="text-xl font-semibold">{digit}</span>
                  {sub ? <span className="-mt-0.5 text-[9px] tracking-widest text-muted-foreground">{sub}</span> : null}
                </motion.button>
              ))}
            </div>
          </div>
        ) : null}

        {isInCall && callState !== "dialing" && callState !== "ringing" ? (
          <div className="px-4 py-3">
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className={`flex flex-col items-center gap-1 rounded-xl p-3 transition-all ${
                  isMuted ? "bg-red-500/20 text-red-400" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                <span className="text-[10px]">{isMuted ? "Unmute" : "Mute"}</span>
              </button>
              <button
                type="button"
                onClick={toggleHold}
                className={`flex flex-col items-center gap-1 rounded-xl p-3 transition-all ${
                  callState === "on_hold" ? "bg-blue-500/20 text-blue-400" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {callState === "on_hold" ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                <span className="text-[10px]">{callState === "on_hold" ? "Resume" : "Hold"}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSpeaker(!isSpeaker)}
                className={`flex flex-col items-center gap-1 rounded-xl p-3 transition-all ${
                  isSpeaker ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {isSpeaker ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                <span className="text-[10px]">Speaker</span>
              </button>
              <button type="button" className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 p-3 text-muted-foreground transition-all hover:bg-muted/60">
                <ArrowRightLeft className="h-5 w-5" />
                <span className="text-[10px]">Transfer</span>
              </button>
            </div>
          </div>
        ) : null}

        <div className="px-4 pb-4 pt-2">
          {!isInCall ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={startCall}
              disabled={!number}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-green-600 font-medium text-white transition-all hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Phone className="h-5 w-5" />
              Call
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={endCall}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-red-600 font-medium text-white transition-all hover:bg-red-500"
            >
              <PhoneOff className="h-5 w-5" />
              End Call
            </motion.button>
          )}
        </div>

        {!isInCall && !number ? (
          <div className="border-t border-border/50">
            <div className="px-4 py-2">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Clock className="h-3 w-3" /> Recent
              </p>
            </div>
            <div className="space-y-0.5 px-2 pb-2">
              {recentCalls.map((call, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNumber(call.number)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/30"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      call.type === "missed" ? "bg-red-500/20" : call.type === "outbound" ? "bg-blue-500/20" : "bg-green-500/20"
                    }`}
                  >
                    <Phone
                      className={`h-3.5 w-3.5 ${
                        call.type === "missed" ? "text-red-400" : call.type === "outbound" ? "text-blue-400" : "text-green-400"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{call.name}</p>
                    <p className="text-[10px] text-muted-foreground">{call.number}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{call.time}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default DialPad;
