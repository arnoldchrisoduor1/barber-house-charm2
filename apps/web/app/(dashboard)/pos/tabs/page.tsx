"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Feature } from "@/components/Feature";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  addPosTabItem,
  closePosTab,
  fetchPosTabs,
  openPosTab,
  tabTotal,
} from "@/lib/api/pos-tabs";
import { formatKes } from "@/lib/api/pos";

export default function PosTabsPage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id ?? "";
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");

  const tabsQuery = useQuery({
    queryKey: ["org", orgId, "pos-tabs"],
    queryFn: () => fetchPosTabs(orgId, "open"),
    enabled: !!orgId,
  });

  const openMut = useMutation({
    mutationFn: () => openPosTab(orgId, label),
    onSuccess: () => {
      setLabel("");
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "pos-tabs"] });
      toast.success("Tab opened");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to open tab"),
  });

  const addItemMut = useMutation({
    mutationFn: ({ tabId, name, price }: { tabId: string; name: string; price: number }) =>
      addPosTabItem(orgId, tabId, { name, unit_price_kes: price }),
    onSuccess: () => {
      setItemName("");
      setItemPrice("");
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "pos-tabs"] });
      toast.success("Item added");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to add item"),
  });

  const closeMut = useMutation({
    mutationFn: (tabId: string) => closePosTab(orgId, tabId),
    onSuccess: () => {
      setActiveTab(null);
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "pos-tabs"] });
      toast.success("Tab settled");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to close tab"),
  });

  const openTabs = tabsQuery.data ?? [];

  const body = (
    <div className="space-y-6" data-testid="pos-tabs-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Open Tabs</h1>
          <p className="text-sm text-muted-foreground">Hold orders, add items, settle later.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/pos">
            <ShoppingCart className="mr-2 h-4 w-4" />
            POS
          </Link>
        </Button>
      </div>

      <Card className="glass">
        <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row">
          <Input
            placeholder="Customer name (e.g. Walk-in chair 2)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            data-testid="pos-tab-label"
          />
          <Button
            onClick={() => openMut.mutate()}
            disabled={!label.trim() || openMut.isPending}
            data-testid="pos-open-tab"
          >
            <Plus className="mr-2 h-4 w-4" />
            Open tab
          </Button>
        </CardContent>
      </Card>

      <div>
        <p className="label-eyebrow mb-2 text-xs">Active · {openTabs.length}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {openTabs.length === 0 ? (
            <Card className="glass p-6 text-center text-sm text-muted-foreground md:col-span-2">No open tabs.</Card>
          ) : (
            openTabs.map((tab) => (
              <Card key={tab.id} className="glass p-4" data-testid="pos-tab-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{tab.label}</p>
                    <p className="text-xs text-muted-foreground">
                      <Receipt className="mr-1 inline h-3 w-3" />
                      {tab.items.length} items
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {formatKes(tabTotal(tab))}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1">
                  {tab.items.map((item) => (
                    <div key={item.id} className="flex justify-between border-b border-border/40 py-1 text-sm">
                      <span>{item.name}</span>
                      <span className="font-mono">{formatKes(item.unitPriceKes * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                {activeTab === tab.id ? (
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <Input placeholder="Item" value={itemName} onChange={(e) => setItemName(e.target.value)} />
                    <Input
                      type="number"
                      placeholder="Price"
                      className="w-full sm:w-24"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                    />
                    <Button
                      size="sm"
                      data-testid="pos-tab-add-item"
                      onClick={() =>
                        addItemMut.mutate({
                          tabId: tab.id,
                          name: itemName,
                          price: Number(itemPrice),
                        })
                      }
                    >
                      Add
                    </Button>
                  </div>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}>
                    {activeTab === tab.id ? "Done" : "Add items"}
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => closeMut.mutate(tab.id)} data-testid="pos-tab-settle">
                    Settle
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <AppShell title="Open Tabs">
      <Feature flag="pos_payments" fallback={<p>Upgrade to Professional for POS.</p>}>
        {body}
      </Feature>
    </AppShell>
  );
}
