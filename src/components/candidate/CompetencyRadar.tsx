import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Series {
  name: string;
  color: string;
  data: { competency: string; value: number }[];
}

export function CompetencyRadar({ series, height = 320 }: { series: Series[]; height?: number }) {
  const axes = series[0]?.data.map((d) => d.competency) ?? [];
  const merged = axes.map((axis) => {
    const row: Record<string, string | number> = { competency: axis };
    for (const s of series) {
      row[s.name] = s.data.find((d) => d.competency === axis)?.value ?? 0;
    }
    return row;
  });

  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <RadarChart data={merged} outerRadius="72%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="competency"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {series.map((s) => (
            <Radar
              key={s.name}
              name={s.name}
              dataKey={s.name}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
          {series.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
