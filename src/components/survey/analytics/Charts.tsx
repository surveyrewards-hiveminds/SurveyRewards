import React from "react";
import {
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h < 0 ? h + 360 : h},70%,70%)`;
}
interface ChartData {
  name: string;
  value: number;
}

interface ChartProps {
  data: ChartData[];
  legendLabel?: string;
}

export function PieChart({ data }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsPie>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            `${name} (${(percent * 100).toFixed(0)}%)`
          }
          outerRadius={160}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={stringToColor(entry.name)} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </RechartsPie>
    </ResponsiveContainer>
  );
}

export function BarChart({ data, legendLabel }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsBar
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend formatter={() => legendLabel || "Responses"} />
        <Bar dataKey="value">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={stringToColor(entry.name)} />
          ))}
        </Bar>
      </RechartsBar>
    </ResponsiveContainer>
  );
}
