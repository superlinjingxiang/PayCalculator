"use client";

import Decimal from "decimal.js";
import type { SalaryInput, SalaryResult } from "@/lib/calculation/types";
import styles from "./SalaryCalculator.module.css";

type Props = { result: SalaryResult; mode: SalaryInput["mode"] };
type CategoryKey = "pension" | "medical" | "unemployment" | "housing" | "tax" | "takeHome";
type Category = { key: CategoryKey; label: string; value: Decimal; color: string; percent: number };

const categoryLabels: Record<CategoryKey, string> = {
  pension: "养老", medical: "医疗", unemployment: "失业", housing: "公积金", tax: "预扣个税", takeHome: "估算实发",
};
const categoryColors: Record<CategoryKey, string> = {
  pension: "#0071e3", medical: "#8b5cf6", unemployment: "#f59e0b", housing: "#14b8a6", tax: "#ef6c5b", takeHome: "#1d1d1f",
};

function amount(value: string | undefined): Decimal {
  try {
    const parsed = new Decimal(value || "0");
    return parsed.isFinite() && parsed.gt(0) ? parsed : new Decimal(0);
  } catch {
    return new Decimal(0);
  }
}

function formatAmount(value: Decimal): string {
  const [integer, fraction] = value.toFixed(2).split(".");
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}

function buildCategories(result: SalaryResult, mode: SalaryInput["mode"]): Category[] {
  const contributions = (key: "pension" | "medical" | "unemployment" | "housing") =>
    result.months.reduce((sum, month) => sum.plus(amount(month.contributionsByType[key])), new Decimal(0));
  const gross = amount(result.grossTotal);
  const values: Array<[CategoryKey, Decimal]> = [
    ["pension", contributions("pension")],
    ["medical", contributions("medical")],
    ["unemployment", contributions("unemployment")],
    ["housing", contributions("housing")],
    ["tax", amount(result.taxWithheldTotal)],
    ["takeHome", amount(result.takeHomeTotal)],
  ];
  return values.map(([key, value]) => ({
    key,
    label: key === "takeHome" && mode === "taxOnly" ? "扣税后余额" : categoryLabels[key],
    value,
    color: categoryColors[key],
    percent: gross.isZero() ? 0 : value.div(gross).mul(100).toNumber(),
  }));
}

export default function SalaryBreakdownChart({ result, mode }: Props) {
  const categories = buildCategories(result, mode);
  const gross = amount(result.grossTotal);
  const visibleCategories = categories.filter((category) => category.percent > 0);
  const segments = visibleCategories.map((category, index) => ({
    ...category,
    offset: visibleCategories.slice(0, index).reduce((sum, item) => sum + item.percent, 0),
  }));
  const chartDescription = `全年收入构成，税前工资 ${formatAmount(gross)} 元，${mode === "taxOnly" ? "仅算个税，个人缴费为零" : "含个人缴费估算"}`;

  return <figure className={styles.breakdownChart} role="figure" aria-label="全年收入构成">
    <figcaption className={styles.chartCaption}><strong>全年收入构成</strong><span>个人缴费按养老、医疗、失业和公积金拆分</span></figcaption>
    <div className={styles.chartLayout}>
      <div className={styles.chartVisual}>
        <svg className={styles.chartSvg} viewBox="0 0 120 120" role="img" aria-label={chartDescription}>
          <circle className={styles.chartTrack} cx="60" cy="60" r="47" pathLength="100" />
          {segments.map((segment) => <circle key={segment.key} className={styles.chartSegment} cx="60" cy="60" r="47" pathLength="100" stroke={segment.color} strokeDasharray={`${segment.percent} ${100 - segment.percent}`} strokeDashoffset={-segment.offset} />)}
          <text className={styles.chartCenterLabel} x="60" y="56" textAnchor="middle">全年税前</text>
          <text className={styles.chartCenterValue} x="60" y="69" textAnchor="middle">{formatAmount(gross)}</text>
        </svg>
      </div>
      <div className={styles.chartLegend} aria-label="收入构成明细">
        {categories.map((category) => <div className={styles.chartLegendItem} key={category.key}>
          <span className={styles.chartSwatch} style={{ backgroundColor: category.color }} aria-hidden="true" />
          <div className={styles.chartLegendText}><span>{category.label}</span><strong>{formatAmount(category.value)} 元</strong><small>{category.percent.toFixed(1)}%</small></div>
        </div>)}
      </div>
    </div>
  </figure>;
}
