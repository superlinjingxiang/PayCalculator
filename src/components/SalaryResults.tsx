"use client";

import { useEffect, useRef, useState } from "react";
import type { SalaryInput, SalaryResult } from "@/lib/calculation/types";
import { salaryCsv } from "@/lib/export/salary-csv";
import styles from "./SalaryCalculator.module.css";

type Props = { result: SalaryResult; mode: SalaryInput["mode"]; regionName: string };

function money(value: string): string {
  const [integer, fraction] = value.split(".");
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction ?? "00"}`;
}

export default function SalaryResults({ result, mode, regionName }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(12);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, [result]);
  const month = result.months[selectedMonth - 1];
  const taxOnly = mode === "taxOnly";
  const downloadCsv = () => {
    const url = URL.createObjectURL(new Blob([salaryCsv(result, { regionName, mode })], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "工资明细-2026.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <section className={styles.results} role="region" aria-label="计算结果">
    <div className={styles.resultHeader}>
      <div><span className={styles.eyebrow}>2026 年 · {regionName} · 测算结果</span><h2 ref={headingRef} tabIndex={-1}>全年一览</h2></div>
      <span className={styles.resultBadge}>{taxOnly ? "个税模式" : "含个人缴费"}</span>
    </div>
    {taxOnly && <p className={styles.taxOnlyNotice}>仅算个税，未扣五险一金</p>}
    {!taxOnly && regionName !== "上海市" && <p className={styles.taxOnlyNotice}>{regionName} 的地方缴费参数未自动核实；以下结果按你填写的基数与比例估算，需与当地政策和工资条核对。</p>}
    <dl className={styles.summaryGrid}>
      <div><dt>全年税前工资</dt><dd><output aria-label="全年税前工资">{money(result.grossTotal)}</output><small>元</small></dd></div>
      <div><dt>全年个人缴费</dt><dd><output aria-label="全年个人缴费">{money(result.personalContributionsTotal)}</output><small>元</small></dd></div>
      <div><dt>全年预扣个税</dt><dd><output aria-label="全年预扣个税">{money(result.taxWithheldTotal)}</output><small>元</small></dd></div>
      <div className={styles.takeHomeCard}><dt>{taxOnly ? "全年扣税后余额" : "估算全年实发"}</dt><dd><output aria-label={taxOnly ? "全年扣税后余额" : "估算全年实发"}>{money(result.takeHomeTotal)}</output><small>元</small></dd></div>
    </dl>
    <p className={styles.equation}>税前工资 − 个人缴费 − 预扣个税 = {taxOnly ? "扣税后余额" : "估算实发"}。{taxOnly && "该余额不代表实际到手工资。"}</p>

    <div className={styles.monthHeader}>
      <div><h3>单月摘要</h3><p>切换月份查看累计预扣与个人缴费组成。</p></div>
      <div className={styles.field}><label htmlFor="salary-result-month">查看月份</label><select id="salary-result-month" value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))}>{result.months.map((entry) => <option key={entry.month} value={entry.month}>{entry.month} 月</option>)}</select></div>
    </div>
    <dl className={styles.monthSummary}>
      <div><dt>本月税前</dt><dd>{money(month.gross)} 元</dd></div>
      <div><dt>本月个人缴费</dt><dd>{money(month.contributionsTotal)} 元</dd></div>
      <div><dt>本月预扣个税</dt><dd>{money(month.currentTax)} 元</dd></div>
      <div className={styles.monthEmphasis}><dt>{taxOnly ? "本月扣税后余额" : "本月估算实发"}</dt><dd>{money(month.takeHome)} 元</dd></div>
    </dl>
    {!taxOnly && <div className={styles.breakdown}>
      <h4>本月个人缴费明细</h4>
      <dl>
        <div><dt>养老</dt><dd>{money(month.contributionsByType.pension)} 元</dd></div>
        <div><dt>医疗</dt><dd>{money(month.contributionsByType.medical)} 元</dd></div>
        <div><dt>失业</dt><dd>{money(month.contributionsByType.unemployment)} 元</dd></div>
        <div><dt>公积金</dt><dd>{money(month.contributionsByType.housing)} 元</dd></div>
      </dl>
    </div>}
    <p className={styles.policyVersion}>本月适用规则：{month.policyVersion}</p>

    <div className={styles.tableHeading}><div><h3>12 个月明细</h3><p>窄屏可横向滑动表格。下载文件仅在本地生成，请妥善保管。</p></div><button type="button" className={styles.exportButton} onClick={downloadCsv}>下载 CSV 明细</button></div>
    <div className={styles.tableScroll} tabIndex={0} aria-label="12 个月工资明细，可横向滚动">
      <table>
        <caption>2026 年逐月工资、个人缴费和累计预扣明细，单位：元</caption>
        <thead><tr><th scope="col">月份</th><th scope="col">税前工资</th><th scope="col">养老</th><th scope="col">医疗</th><th scope="col">失业</th><th scope="col">公积金</th><th scope="col">个人缴费合计</th><th scope="col">基本减除</th><th scope="col">专项附加扣除</th><th scope="col">其他依法扣除</th><th scope="col">免税收入</th><th scope="col">累计应税所得</th><th scope="col">累计已预扣</th><th scope="col">本月预扣</th><th scope="col">{taxOnly ? "扣税后余额" : "估算实发"}</th><th scope="col">适用规则</th></tr></thead>
        <tbody>{result.months.map((entry) => <tr key={entry.month}>
          <th scope="row">{entry.month} 月</th><td>{money(entry.gross)}</td><td>{money(entry.contributionsByType.pension)}</td><td>{money(entry.contributionsByType.medical)}</td><td>{money(entry.contributionsByType.unemployment)}</td><td>{money(entry.contributionsByType.housing)}</td><td>{money(entry.contributionsTotal)}</td><td>{money(entry.basicDeduction)}</td><td>{money(entry.additionalDeduction)}</td><td>{money(entry.otherDeduction)}</td><td>{money(entry.exemptIncome)}</td><td>{money(entry.cumulativeTaxable)}</td><td>{money(entry.cumulativeWithholding)}</td><td>{money(entry.currentTax)}</td><td>{money(entry.takeHome)}</td><td>{entry.policyVersion}</td>
        </tr>)}</tbody>
      </table>
    </div>

    {(result.warnings.length > 0 || result.assumptions.length > 0) && <div className={styles.notes}>
      {result.warnings.length > 0 && <div><h3>提醒与限制</h3><ul>{result.warnings.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>}
      {result.assumptions.length > 0 && <div><h3>计算假设</h3><ul>{result.assumptions.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>}
    </div>}
  </section>;
}
