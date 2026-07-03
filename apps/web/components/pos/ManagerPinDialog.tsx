"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PIN_KEY = "haus-manager-pin";

export function getStoredManagerPin(): string {
  if (typeof window === "undefined") return "1234";
  return localStorage.getItem(PIN_KEY) || "1234";
}

export function setStoredManagerPin(pin: string) {
  localStorage.setItem(PIN_KEY, pin);
}

interface ManagerPinDialogProps {
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  reason: string;
}

export function ManagerPinDialog({ open, onClose, onApprove, reason }: ManagerPinDialogProps) {
  const [pin, setPin] = useState("");

  function submit() {
    if (pin === getStoredManagerPin()) {
      toast.success("Manager approved");
      setPin("");
      onApprove();
      onClose();
    } else {
      toast.error("Invalid manager PIN");
      setPin("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Manager override
          </DialogTitle>
          <DialogDescription>{reason}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="manager-pin">Manager PIN</Label>
            <Input
              id="manager-pin"
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="••••"
              className="text-center text-lg tracking-widest"
              autoFocus
            />
            <p className="mt-1 text-[10px] text-muted-foreground">Default demo PIN: 1234</p>
          </div>
          <Button className="w-full" disabled={pin.length < 4} onClick={submit}>
            Approve
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
