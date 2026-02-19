import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface BudgetChartData {
  category: string;
  budgeted: number;
  spent: number;
}

interface BudgetChartProps {
  data: BudgetChartData[];
  height?: number;
}

function formatAxis(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function formatTooltip(value: number | undefined): string {
  if (value == null) return "";
  return `$${value.toLocaleString("en-US")}`;
}

export function BudgetChart({ data, height = 300 }: BudgetChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="var(--color-muted)" />
        <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11 }} stroke="var(--color-muted)" />
        <Tooltip
          formatter={formatTooltip}
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Bar dataKey="budgeted" name="Budgeted" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="spent" name="Spent" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
