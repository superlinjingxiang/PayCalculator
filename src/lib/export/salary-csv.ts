import type { SalaryInput, SalaryResult } from "@/lib/calculation/types";

function cell(value: string): string {
  // Preserve actual signed amounts; spreadsheet formula prefixes in text are escaped.
  const safe = /^[\s]*[=+\-@]/.test(value) && !/^-?\d+(?:\.\d+)?$/.test(value)
    ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function salaryCsv(result: SalaryResult, context: { regionName: string; mode: SalaryInput["mode"] }): string {
  const taxOnly = context.mode === "taxOnly";
  const rows: string[][] = [
    ["工资估算明细", "2026"], ["地区", context.regionName],
    ["计算范围", taxOnly ? "仅算个税，未扣五险一金" : "含个人缴费估算"],
    ["金额单位", "人民币元"],
    [
      "月份", "税前工资",
      "社保输入基数", "社保有效基数", "社保基数调整",
      "公积金输入基数", "公积金有效基数", "公积金基数调整",
      "养老费率", "医疗费率", "失业费率", "公积金费率",
      "养老", "医疗", "失业", "公积金", "个人缴费合计",
      "基本减除", "专项附加扣除", "其他依法扣除", "免税收入", "累计应税所得",
      "累计已预扣", "本月预扣", taxOnly ? "扣税后余额" : "估算实发", "规则版本", "规则核对日期",
    ],
    ...result.months.map((entry) => [
      String(entry.month), entry.gross,
      entry.contributionDetails?.socialInsuranceBase.entered ?? "",
      entry.contributionDetails?.socialInsuranceBase.effective ?? "",
      entry.contributionDetails?.socialInsuranceBase.adjustedBy ?? "",
      entry.contributionDetails?.housingFundBase.entered ?? "",
      entry.contributionDetails?.housingFundBase.effective ?? "",
      entry.contributionDetails?.housingFundBase.adjustedBy ?? "",
      entry.contributionDetails?.rates.pension ?? "",
      entry.contributionDetails?.rates.medical ?? "",
      entry.contributionDetails?.rates.unemployment ?? "",
      entry.contributionDetails?.rates.housing ?? "",
      entry.contributionsByType.pension, entry.contributionsByType.medical,
      entry.contributionsByType.unemployment, entry.contributionsByType.housing, entry.contributionsTotal,
      entry.basicDeduction, entry.additionalDeduction, entry.otherDeduction, entry.exemptIncome, entry.cumulativeTaxable,
      entry.cumulativeWithholding, entry.currentTax, entry.takeHome, entry.policyVersion, entry.policyVerifiedAt,
    ]),
    [], ["年度汇总", "税前工资", "个人缴费合计", "专项附加扣除", "预扣个税", taxOnly ? "扣税后余额" : "估算实发"],
    ["全年合计", result.grossTotal, result.personalContributionsTotal, result.additionalDeductionsTotal, result.taxWithheldTotal, result.takeHomeTotal],
    ...result.warnings.map((warning) => ["提醒", warning]),
    ...result.assumptions.map((assumption) => ["计算假设", assumption]),
    ["说明", "根据输入参数估算，不等于单位实际工资条或个税年度汇算。文件包含工资数据，请自行妥善保管。"],
  ];
  return `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}
