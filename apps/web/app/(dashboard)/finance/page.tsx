"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

import { CrudDialog } from "@/components/CrudDialog";
import { DataTable } from "@/components/DataTable";
import { EntityForm, type FormFieldDef } from "@/components/EntityForm";
import { ModulePage } from "@/components/ModulePage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBranchFilter } from "@/hooks/useBranchFilter";
import { apiClient } from "@/lib/api-client";
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  fetchRevenueChart,
  formatKes,
  updateExpense,
  type ExpenseRow,
} from "@/lib/api/finance";
import { pickRowField } from "@/lib/record-fields";
import { cn } from "@/lib/utils";

type FinanceTab = "overview" | "expenses" | "transactions" | "payouts";
type Payout = Record<string, unknown>;
type LedgerEntry = Record<string, unknown>;

const EXPENSE_CATEGORIES = [
  "general",
  "rent",
  "utilities",
  "supplies",
  "salaries",
  "marketing",
  "maintenance",
  "equipment",
  "other",
];

const EXPENSE_FIELDS: FormFieldDef[] = [
  {
    name: "category",
    label: "Category",
    type: "select",
    required: true,
    options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
  },
  { name: "description", label: "Description", type: "textarea" },
  { name: "amount_kes", label: "Amount (KES)", type: "number", required: true },
  { name: "expense_date", label: "Date", required: true },
  { name: "receipt_url", label: "Receipt URL (optional)" },
];

function FinanceTabs({
  active,
  onChange,
}: {
  active: FinanceTab;
  onChange: (tab: FinanceTab) => void;
}) {
  const tabs: { id: FinanceTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "expenses", label: "Expenses" },
    { id: "transactions", label: "Transactions" },
    { id: "payouts", label: "Payouts" },
  ];

  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1"
      role="tablist"
      aria-label="Finance sections"
      data-testid="finance-tabs"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === tab.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function FinancePage() {
  const { activeOrg } = useAuth();
  const orgId = activeOrg?.id;
  const { apiParams, activeBranchId } = useBranchFilter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<FinanceTab>("overview");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [expenseValues, setExpenseValues] = useState<Record<string, string>>({
    category: "general",
    description: "",
    amount_kes: "",
    expense_date: new Date().toISOString().slice(0, 10),
    receipt_url: "",
  });

  const balanceQuery = useQuery({
    queryKey: ["org", orgId, "ledger-balance"],
    enabled: !!orgId,
    queryFn: () => apiClient<{ balanceKes: number }>(`/organizations/${orgId}/ledger/balance`),
  });

  const chartQuery = useQuery({
    queryKey: ["org", orgId, "revenue-chart", apiParams],
    enabled: !!orgId,
    queryFn: () => fetchRevenueChart(orgId!, { ...apiParams, days: "30" }),
  });

  const expensesQuery = useQuery({
    queryKey: ["org", orgId, "finance-expenses", apiParams],
    enabled: !!orgId,
    queryFn: () => fetchExpenses(orgId!, apiParams),
  });

  const payoutsQuery = useQuery({
    queryKey: ["org", orgId, "payouts"],
    enabled: !!orgId,
    queryFn: () => apiClient<{ data: Payout[] }>(`/organizations/${orgId}/payouts`),
  });

  const ledgerQuery = useQuery({
    queryKey: ["org", orgId, "ledger-entries"],
    enabled: !!orgId,
    queryFn: () => apiClient<LedgerEntry[]>(`/organizations/${orgId}/ledger/entries`),
  });

  const transactionsQuery = useQuery({
    queryKey: ["org", orgId, "finance-transactions", apiParams],
    enabled: !!orgId,
    queryFn: () => apiClient<{ data: Record<string, unknown>[] }>(`/organizations/${orgId}/transactions`, { params: apiParams }),
  });

  const saveExpenseMut = useMutation({
    mutationFn: async () => {
      const body = {
        amount_kes: Number.parseInt(expenseValues.amount_kes, 10) || 0,
        category: expenseValues.category || "general",
        description: expenseValues.description,
        receipt_url: expenseValues.receipt_url,
        expense_date: expenseValues.expense_date,
        branch_id: activeBranchId ?? undefined,
      };
      if (editingExpense) {
        return updateExpense(orgId!, editingExpense.id, body);
      }
      return createExpense(orgId!, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "finance-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "revenue-chart"] });
      toast.success(editingExpense ? "Expense updated" : "Expense recorded");
      setExpenseOpen(false);
      setEditingExpense(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Save failed"),
  });

  const deleteExpenseMut = useMutation({
    mutationFn: (id: string) => deleteExpense(orgId!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", orgId, "finance-expenses"] });
      toast.success("Expense deleted");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  const chartData = useMemo(
    () =>
      (chartQuery.data ?? []).map((point) => ({
        label: point.date.slice(5),
        revenue: point.revenueKes,
        expenses: point.expensesKes,
      })),
    [chartQuery.data],
  );

  const totalRevenue = useMemo(
    () => (chartQuery.data ?? []).reduce((sum, p) => sum + p.revenueKes, 0),
    [chartQuery.data],
  );
  const totalExpenses = useMemo(
    () => (expensesQuery.data ?? []).reduce((sum, e) => sum + e.amountKes, 0),
    [expensesQuery.data],
  );
  const profit = totalRevenue - totalExpenses;

  function openCreateExpense() {
    setEditingExpense(null);
    setExpenseValues({
      category: "general",
      description: "",
      amount_kes: "",
      expense_date: new Date().toISOString().slice(0, 10),
      receipt_url: "",
    });
    setExpenseOpen(true);
  }

  function openEditExpense(row: ExpenseRow) {
    setEditingExpense(row);
    setExpenseValues({
      category: row.category,
      description: row.description,
      amount_kes: String(row.amountKes),
      expense_date: row.expenseDate.slice(0, 10),
      receipt_url: row.receiptUrl ?? "",
    });
    setExpenseOpen(true);
  }

  const expenseRows = (expensesQuery.data ?? []).map((row) => ({
    ...row,
    amount_kes: row.amountKes,
    expense_date: row.expenseDate,
    receipt_url: row.receiptUrl,
  })) as Record<string, unknown>[];

  return (
    <ModulePage title="Finance" description="Wallet balance, expenses, ledger, and payouts.">
      <div className="space-y-6">
        <FinanceTabs active={tab} onChange={setTab} />

        {tab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4 text-primary" /> Wallet balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-2xl">
                    {balanceQuery.isLoading
                      ? "…"
                      : formatKes(balanceQuery.data?.balanceKes ?? 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-green-500" /> Revenue (30d)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-2xl text-green-500">{formatKes(totalRevenue)}</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingDown className="h-4 w-4 text-red-500" /> Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-display text-2xl text-red-500">{formatKes(totalExpenses)}</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Net (30d chart)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`font-display text-2xl ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
                    {formatKes(profit)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="glass">
              <CardHeader>
                <CardTitle>Revenue vs expenses</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {chartQuery.isLoading ? (
                  <p className="text-muted-foreground">Loading chart…</p>
                ) : chartData.length === 0 ? (
                  <p className="text-muted-foreground">No chart data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip formatter={(v) => formatKes(Number(v ?? 0))} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle>Daily net cash flow</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData.map((d) => ({ ...d, net: d.revenue - d.expenses }))}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v) => formatKes(Number(v ?? 0))} />
                    <Bar dataKey="net" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tab === "expenses" ? (
          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Expenses</CardTitle>
              <Button size="sm" className="gap-2" onClick={openCreateExpense}>
                <Plus className="h-4 w-4" /> Record expense
              </Button>
            </CardHeader>
            <CardContent>
              {expensesQuery.isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
              {expensesQuery.error ? (
                <p className="text-destructive">Failed to load expenses.</p>
              ) : null}
              <DataTable
                columns={[
                  {
                    key: "expense_date",
                    header: "Date",
                    render: (row) => String(pickRowField(row, "expense_date") ?? "—").slice(0, 10),
                  },
                  {
                    key: "category",
                    header: "Category",
                    render: (row) => String(pickRowField(row, "category") ?? "—"),
                  },
                  {
                    key: "description",
                    header: "Description",
                    render: (row) => String(pickRowField(row, "description") ?? "—"),
                  },
                  {
                    key: "amount_kes",
                    header: "Amount",
                    render: (row) => formatKes(Number(pickRowField(row, "amount_kes") ?? 0)),
                  },
                ]}
                rows={expenseRows}
                emptyMessage="No expenses recorded yet."
                onEdit={(row) => openEditExpense(row as unknown as ExpenseRow)}
                onDelete={(row) => deleteExpenseMut.mutate(String(pickRowField(row, "id")))}
              />
            </CardContent>
          </Card>
        ) : null}

        {tab === "transactions" ? (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Ledger entries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {ledgerQuery.isLoading ? <p className="text-muted-foreground">Loading ledger…</p> : null}
              <DataTable
                columns={[
                  {
                    key: "created_at",
                    header: "When",
                    render: (row) => String(pickRowField(row, "created_at") ?? "—"),
                  },
                  { key: "account", header: "Account" },
                  { key: "direction", header: "Direction" },
                  {
                    key: "amount_kes",
                    header: "Amount",
                    render: (row) => formatKes(Number(pickRowField(row, "amount_kes") ?? 0)),
                  },
                  { key: "ref", header: "Ref" },
                ]}
                rows={Array.isArray(ledgerQuery.data) ? ledgerQuery.data : []}
                emptyMessage="No ledger entries yet."
              />

              <div>
                <h3 className="mb-3 font-medium">POS transactions</h3>
                {transactionsQuery.isLoading ? (
                  <p className="text-muted-foreground">Loading transactions…</p>
                ) : (
                  <DataTable
                    columns={[
                      {
                        key: "created_at",
                        header: "When",
                        render: (row) => String(pickRowField(row, "created_at") ?? "—"),
                      },
                      {
                        key: "payment_method",
                        header: "Method",
                        render: (row) => String(pickRowField(row, "payment_method") ?? "—"),
                      },
                      {
                        key: "payment_status",
                        header: "Status",
                        render: (row) => String(pickRowField(row, "payment_status") ?? "—"),
                      },
                      {
                        key: "amount_kes",
                        header: "Amount",
                        render: (row) => formatKes(Number(pickRowField(row, "amount_kes") ?? 0)),
                      },
                    ]}
                    rows={transactionsQuery.data?.data ?? []}
                    emptyMessage="No POS transactions yet."
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {tab === "payouts" ? (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Payouts</CardTitle>
            </CardHeader>
            <CardContent>
              {payoutsQuery.isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
              {payoutsQuery.error ? <p className="text-destructive">Failed to load payouts.</p> : null}
              <DataTable
                columns={[
                  {
                    key: "amount_kes",
                    header: "Amount",
                    render: (row) => formatKes(Number(pickRowField(row, "amount_kes") ?? 0)),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (row) => String(pickRowField(row, "status") ?? "—"),
                  },
                  {
                    key: "merchant_reference",
                    header: "Reference",
                    render: (row) => String(pickRowField(row, "merchant_reference") ?? "—"),
                  },
                  {
                    key: "created_at",
                    header: "Created",
                    render: (row) => String(pickRowField(row, "created_at") ?? "—"),
                  },
                ]}
                rows={payoutsQuery.data?.data ?? []}
                emptyMessage="No payouts yet."
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <CrudDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        title={editingExpense ? "Edit expense" : "Record expense"}
        onSubmit={() => saveExpenseMut.mutate()}
        loading={saveExpenseMut.isPending}
        submitLabel={editingExpense ? "Update" : "Save"}
      >
        <EntityForm
          fields={EXPENSE_FIELDS}
          values={expenseValues}
          onChange={(name, value) => setExpenseValues((prev) => ({ ...prev, [name]: value }))}
        />
      </CrudDialog>
    </ModulePage>
  );
}
