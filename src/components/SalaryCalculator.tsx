"use client";

import { useState, type FormEvent } from "react";
import { calculateSalary, SalaryValidationError } from "@/lib/calculation/salary";
import type { SalaryInput, SalaryResult } from "@/lib/calculation/types";
import { isDirectMunicipality, MAINLAND_PROVINCES, regionName } from "@/lib/regions";
import SalaryResults from "./SalaryResults";
import styles from "./SalaryCalculator.module.css";

type FormState = {
  cityCode: SalaryInput["cityCode"];
  provinceCode: string;
  regionCode: string;
  mode: SalaryInput["mode"];
  startMonth: string;
  monthlyGross: string;
  variableSalary: boolean;
  monthlyGrossOverrides: string[];
  monthlyGrossOverridesTouched: boolean[];
  socialInsuranceBase: string;
  housingFundBase: string;
  changeBasesH2: boolean;
  socialInsuranceBaseH2: string;
  housingFundBaseH2: string;
  pension: string;
  medical: string;
  unemployment: string;
  housingH1: string;
  housingH2: string;
  additionalDeductionsMonthly: string;
  otherDeductionsMonthly: string;
  exemptIncomeMonthly: string;
};

type ErrorMap = Record<string, string>;
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const MONEY_PATTERN = /^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/;
const RATE_PATTERN = /^(?:(?:0|[1-9]\d?)(?:\.\d{1,2})?|100(?:\.0{1,2})?)$/;

const initialForm: FormState = {
  cityCode: "shanghai", provinceCode: "310000", regionCode: "310000", mode: "taxOnly", startMonth: "1", monthlyGross: "",
  variableSalary: false, monthlyGrossOverrides: Array(12).fill(""), monthlyGrossOverridesTouched: Array(12).fill(false),
  socialInsuranceBase: "", housingFundBase: "", pension: "", medical: "",
  changeBasesH2: false, socialInsuranceBaseH2: "", housingFundBaseH2: "",
  unemployment: "", housingH1: "", housingH2: "",
  additionalDeductionsMonthly: "", otherDeductionsMonthly: "", exemptIncomeMonthly: "",
};

function fieldId(name: string): string { return `salary-${name.replaceAll(".", "-")}`; }
function validateMoney(value: string, label: string, required: boolean, positive = false): string | undefined {
  if (!value.trim()) return required ? `请输入${label}` : undefined;
  if (!MONEY_PATTERN.test(value.trim())) return "请输入非负金额，最多两位小数且不超过 999,999,999.99 元";
  if (positive && Number(value) <= 0) return `${label}须大于 0`;
}
function validateRate(value: string, label: string, shanghaiHousing = false): string | undefined {
  if (!value.trim()) return `请填写${label}`;
  if (shanghaiHousing && !/^[567]$/.test(value.trim())) return "上海公积金比例请填写 5、6 或 7";
  if (!RATE_PATTERN.test(value.trim())) return "请输入 0–100 之间的百分比，最多两位小数";
}
function validateForm(form: FormState): ErrorMap {
  const errors: ErrorMap = {};
  const put = (name: string, message: string | undefined) => { if (message) errors[name] = message; };
  put("monthlyGross", validateMoney(form.monthlyGross, "税前月薪", true));
  if (form.variableSalary) for (const month of MONTHS) {
    if (month >= Number(form.startMonth)) put(`monthlyGrossOverrides.${month - 1}`, validateMoney(form.monthlyGrossOverrides[month - 1], `${month} 月工资`, true));
  }
  if (form.mode === "detailed") {
    put("socialInsuranceBase", validateMoney(form.socialInsuranceBase, "社保缴费基数", true, true));
    put("housingFundBase", validateMoney(form.housingFundBase, "公积金缴费基数", true, true));
    if (form.changeBasesH2) {
      put("socialInsuranceBaseH2", validateMoney(form.socialInsuranceBaseH2, "7—12 月社保缴费基数", true, true));
      put("housingFundBaseH2", validateMoney(form.housingFundBaseH2, "7—12 月公积金缴费基数", true, true));
    }
    if (form.cityCode === "custom") {
      put("contributionRates.pension", validateRate(form.pension, "个人养老比例"));
      put("contributionRates.medical", validateRate(form.medical, "个人医疗比例"));
      put("contributionRates.unemployment", validateRate(form.unemployment, "个人失业比例"));
    }
    put("contributionRates.housingH1", validateRate(form.housingH1, "1—6 月个人公积金比例", form.cityCode === "shanghai"));
    put("contributionRates.housingH2", validateRate(form.housingH2, "7—12 月个人公积金比例", form.cityCode === "shanghai"));
  }
  put("additionalDeductionsMonthly", validateMoney(form.additionalDeductionsMonthly, "专项附加扣除", false));
  put("otherDeductionsMonthly", validateMoney(form.otherDeductionsMonthly, "其他扣除", false));
  put("exemptIncomeMonthly", validateMoney(form.exemptIncomeMonthly, "免税收入", false));
  return errors;
}

type InputFieldProps = { name: string; label: string; value: string; error?: string; hint?: string; suffix?: string; onChange: (value: string) => void };
function InputField({ name, label, value, error, hint, suffix, onChange }: InputFieldProps) {
  const id = fieldId(name);
  return <div className={styles.field}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.inputShell}>
      <input id={id} name={name} type="text" inputMode="decimal" autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined} />
      {suffix && <span className={styles.suffix} aria-hidden="true">{suffix}</span>}
    </div>
    {hint && <p id={`${id}-hint`} className={styles.hint}>{hint}</p>}
    {error && <p id={`${id}-error`} className={styles.error}>{error}</p>}
  </div>;
}

export default function SalaryCalculator({ compactIntro = false }: { compactIntro?: boolean }) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [result, setResult] = useState<SalaryResult | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const province = MAINLAND_PROVINCES.find((item) => item.code === form.provinceCode)!;
  const selectedRegionName = regionName(form.provinceCode, form.regionCode);

  const change = <K extends keyof FormState>(name: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => { const next = { ...current }; delete next[name]; return next; });
    setResult(null);
  };
  const changeProvince = (code: string) => {
    setForm((current) => ({
      ...current,
      provinceCode: code,
      regionCode: code,
      cityCode: code === "310000" ? "shanghai" : "custom",
    }));
    setErrors({});
    setResult(null);
  };
  const changeMonthlyGross = (value: string) => {
    setForm((current) => ({
      ...current,
      monthlyGross: value,
      monthlyGrossOverrides: current.variableSalary
        ? current.monthlyGrossOverrides.map((amount, index) => current.monthlyGrossOverridesTouched[index] ? amount : value)
        : current.monthlyGrossOverrides,
    }));
    setErrors((current) => { const next = { ...current }; delete next.monthlyGross; return next; });
    setResult(null);
  };
  const changeRate = (name: "pension" | "medical" | "unemployment" | "housingH1" | "housingH2", value: string) => {
    change(name, value);
    setErrors((current) => { const next = { ...current }; delete next[`contributionRates.${name}`]; return next; });
  };
  const changeOverride = (index: number, value: string) => {
    setForm((current) => {
      const monthlyGrossOverrides = [...current.monthlyGrossOverrides];
      const monthlyGrossOverridesTouched = [...current.monthlyGrossOverridesTouched];
      monthlyGrossOverrides[index] = value;
      monthlyGrossOverridesTouched[index] = true;
      return { ...current, monthlyGrossOverrides, monthlyGrossOverridesTouched };
    });
    setErrors((current) => { const next = { ...current }; delete next[`monthlyGrossOverrides.${index}`]; return next; });
    setResult(null);
  };
  const toggleVariable = (checked: boolean) => {
    setForm((current) => ({ ...current, variableSalary: checked, monthlyGrossOverrides: checked ? current.monthlyGrossOverrides.map((value, index) => current.monthlyGrossOverridesTouched[index] ? value : current.monthlyGross) : current.monthlyGrossOverrides }));
    setErrors({}); setResult(null);
  };
  const focusField = (name: string) => document.getElementById(fieldId(name))?.focus();
  const revealAndFocus = (name: string) => {
    if (["additionalDeductionsMonthly", "otherDeductionsMonthly", "exemptIncomeMonthly"].includes(name)) {
      setAdvancedOpen(true);
      window.setTimeout(() => focusField(name), 0);
    } else focusField(name);
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors); setResult(null); revealAndFocus(Object.keys(nextErrors)[0]); return;
    }
    const input: SalaryInput = {
      taxYear: 2026, cityCode: form.cityCode, mode: form.mode,
      startMonth: Number(form.startMonth), monthlyGross: form.monthlyGross.trim(),
      ...(form.variableSalary && { monthlyGrossOverrides: form.monthlyGrossOverrides.map((value, index) => index + 1 < Number(form.startMonth) ? "0" : value.trim()) }),
      additionalDeductionsMonthly: form.additionalDeductionsMonthly.trim() || "0",
      otherDeductionsMonthly: form.otherDeductionsMonthly.trim() || "0",
      exemptIncomeMonthly: form.exemptIncomeMonthly.trim() || "0",
      ...(form.mode === "detailed" && {
        socialInsuranceBase: form.socialInsuranceBase.trim(), housingFundBase: form.housingFundBase.trim(),
        ...(form.changeBasesH2 && {
          socialInsuranceBaseH2: form.socialInsuranceBaseH2.trim(), housingFundBaseH2: form.housingFundBaseH2.trim(),
        }),
        contributionRates: {
          ...(form.cityCode === "custom" && { pension: form.pension.trim(), medical: form.medical.trim(), unemployment: form.unemployment.trim() }),
          housingH1: form.housingH1.trim(), housingH2: form.housingH2.trim(),
        },
      }),
    };
    try { setResult(calculateSalary(input)); setHasCalculated(true); setErrors({}); }
    catch (error) {
      if (error instanceof SalaryValidationError) {
        setErrors({ [error.field]: error.message }); setResult(null); revealAndFocus(error.field);
      } else { setErrors({ form: "计算暂时无法完成，请检查输入后重试。" }); setResult(null); }
    }
  };

  return <div className={styles.calculator}>
    <section className={styles.panel} aria-label="工资计算器">
      {!compactIntro && <div className={styles.intro}>
        <span className={styles.eyebrow}>2026 年 · 中国大陆居民工资薪金</span>
        <h2>填写工资，查看全年每月明细</h2>
        <p>按累计预扣法估算。本工具适用于单一单位按月发放工资的常规场景。</p>
      </div>}
      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.primaryField}>
          <InputField name="monthlyGross" label="税前月薪（元）" value={form.monthlyGross} error={errors.monthlyGross} hint="与社保、公积金缴费基数分开填写。" suffix="元" onChange={changeMonthlyGross} />
        </div>
        <fieldset className={styles.modeGroup}>
          <legend>计算范围</legend>
          <div className={styles.modeOptions}>
            <label className={form.mode === "taxOnly" ? styles.modeSelected : styles.modeOption}>
              <input type="radio" name="mode" value="taxOnly" checked={form.mode === "taxOnly"} onChange={() => { change("mode", "taxOnly"); setErrors({}); }} />
              <span><strong>仅算个税</strong><small>无需社保与公积金参数，余额不代表完整实发</small></span>
            </label>
            <label className={form.mode === "detailed" ? styles.modeSelected : styles.modeOption}>
              <input type="radio" name="mode" value="detailed" checked={form.mode === "detailed"} onChange={() => { change("mode", "detailed"); setErrors({}); }} />
              <span><strong>含个人缴费估算</strong><small>填写缴费基数与未核实的个人费率</small></span>
            </label>
          </div>
        </fieldset>
        <div className={styles.grid}>
          <div className={styles.field}><label htmlFor="salary-year">计算年度</label><input id="salary-year" type="text" value="2026 年" readOnly aria-readonly="true" /><p className={styles.hint}>目前仅支持 2026 年。</p></div>
          <div className={styles.field}><label htmlFor="salary-province">省份或直辖市</label><select id="salary-province" value={form.provinceCode} onChange={(event) => changeProvince(event.target.value)}>{MAINLAND_PROVINCES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select><p className={styles.hint}>覆盖中国大陆 31 个省级地区；个税规则全国统一。</p></div>
          {!isDirectMunicipality(form.provinceCode) && <div className={styles.field}><label htmlFor="salary-region">城市或地区</label><select id="salary-region" value={form.regionCode} onChange={(event) => change("regionCode", event.target.value)}><option value={province.code}>未指定城市（手动参数）</option>{province.cities.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select><p className={styles.hint}>可选择地级市、自治州、地区及省直管县级地区。</p></div>}
          <div className={styles.field}><label htmlFor="salary-start-month">本单位入职月份</label><select id="salary-start-month" value={form.startMonth} onChange={(event) => change("startMonth", event.target.value)}>{MONTHS.map((month) => <option key={month} value={month}>{month} 月</option>)}</select><p className={styles.hint}>此前月份按本单位无工资处理。</p></div>
        </div>
        <div className={styles.variableBlock}>
          <label className={styles.switchLine} htmlFor="salary-variable"><input id="salary-variable" type="checkbox" checked={form.variableSalary} onChange={(event) => toggleVariable(event.target.checked)} /><span><strong>每月工资不同</strong><small>税前月薪会填入尚未修改的月份，可逐月调整。</small></span></label>
          {form.variableSalary && <div className={styles.monthGrid}>{MONTHS.map((month) => month >= Number(form.startMonth) && <InputField key={month} name={`monthlyGrossOverrides.${month - 1}`} label={`${month} 月工资（元）`} value={form.monthlyGrossOverrides[month - 1]} error={errors[`monthlyGrossOverrides.${month - 1}`]} onChange={(value) => changeOverride(month - 1, value)} />)}</div>}
        </div>
        {form.mode === "detailed" && <section className={styles.detailSection} aria-labelledby="salary-contributions-title">
          <h3 id="salary-contributions-title">个人缴费参数</h3>
          <p className={styles.sectionNote}>{form.cityCode === "shanghai" ? "上海社保比例按已记录的政策资料计算；请确认自己的缴费基数与上、下半年公积金比例。" : `${selectedRegionName} 的地方费率与缴费基数上下限尚未自动核实；请依据当地官方规则和单位实际申报填写全部个人费率与基数。`} 默认将以下基数用于全年任职月份；如单位在 7 月调整，可在下方填写新基数。上海按月份适用上下限，其他地区不自动套用上下限。</p>
          <div className={styles.grid}>
            <InputField name="socialInsuranceBase" label="社保缴费基数（元）" value={form.socialInsuranceBase} error={errors.socialInsuranceBase} suffix="元" onChange={(value) => change("socialInsuranceBase", value)} />
            <InputField name="housingFundBase" label="公积金缴费基数（元）" value={form.housingFundBase} error={errors.housingFundBase} suffix="元" onChange={(value) => change("housingFundBase", value)} />
            {form.cityCode === "custom" && <>
              <InputField name="contributionRates.pension" label="个人养老比例（%）" value={form.pension} error={errors["contributionRates.pension"]} suffix="%" onChange={(value) => changeRate("pension", value)} />
              <InputField name="contributionRates.medical" label="个人医疗比例（%）" value={form.medical} error={errors["contributionRates.medical"]} suffix="%" onChange={(value) => changeRate("medical", value)} />
              <InputField name="contributionRates.unemployment" label="个人失业比例（%）" value={form.unemployment} error={errors["contributionRates.unemployment"]} suffix="%" onChange={(value) => changeRate("unemployment", value)} />
            </>}
            <InputField name="contributionRates.housingH1" label="1—6 月个人公积金比例（%）" value={form.housingH1} error={errors["contributionRates.housingH1"]} hint={form.cityCode === "shanghai" ? "上海个人比例请填写 5、6 或 7。" : undefined} suffix="%" onChange={(value) => changeRate("housingH1", value)} />
            <InputField name="contributionRates.housingH2" label="7—12 月个人公积金比例（%）" value={form.housingH2} error={errors["contributionRates.housingH2"]} hint={form.cityCode === "shanghai" ? "上海个人比例请填写 5、6 或 7。" : undefined} suffix="%" onChange={(value) => changeRate("housingH2", value)} />
          </div>
          {form.cityCode === "custom" && <p className={styles.sectionNote}>手动模式按基数乘比例估算。当地如有医疗互助等固定费用、特殊减免或缴存安排，本版不会自动计入，结果需与工资条核对。</p>}
          <div className={styles.variableBlock}>
            <label className={styles.switchLine} htmlFor="salary-bases-h2"><input id="salary-bases-h2" type="checkbox" checked={form.changeBasesH2} onChange={(event) => { change("changeBasesH2", event.target.checked); setErrors({}); }} /><span><strong>7 月起缴费基数调整</strong><small>新基数用于 7—12 月，1—6 月继续使用上方基数。</small></span></label>
            {form.changeBasesH2 && <div className={styles.monthGrid}>
              <InputField name="socialInsuranceBaseH2" label="7—12 月社保缴费基数（元）" value={form.socialInsuranceBaseH2} error={errors.socialInsuranceBaseH2} suffix="元" onChange={(value) => change("socialInsuranceBaseH2", value)} />
              <InputField name="housingFundBaseH2" label="7—12 月公积金缴费基数（元）" value={form.housingFundBaseH2} error={errors.housingFundBaseH2} suffix="元" onChange={(value) => change("housingFundBaseH2", value)} />
            </div>}
          </div>
        </section>}
        <div className={styles.advanced}>
          <button type="button" className={styles.advancedToggle} aria-expanded={advancedOpen} aria-controls="salary-advanced" onClick={() => setAdvancedOpen(!advancedOpen)}><span>其他扣除与免税收入</span><span aria-hidden="true">{advancedOpen ? "−" : "+"}</span></button>
          {advancedOpen && <div id="salary-advanced" className={styles.grid}>
            <InputField name="additionalDeductionsMonthly" label="专项附加扣除（月额，元）" value={form.additionalDeductionsMonthly} error={errors.additionalDeductionsMonthly} hint="如子女教育、住房租金等，按本人可享受金额填写。" suffix="元" onChange={(value) => change("additionalDeductionsMonthly", value)} />
            <InputField name="otherDeductionsMonthly" label="其他依法扣除（月额，元）" value={form.otherDeductionsMonthly} error={errors.otherDeductionsMonthly} suffix="元" onChange={(value) => change("otherDeductionsMonthly", value)} />
            <InputField name="exemptIncomeMonthly" label="免税收入（月额，元）" value={form.exemptIncomeMonthly} error={errors.exemptIncomeMonthly} suffix="元" onChange={(value) => change("exemptIncomeMonthly", value)} />
          </div>}
        </div>
        {Object.keys(errors).length > 0 && <div className={styles.errorSummary} role="alert">{errors.form || `有 ${Object.keys(errors).length} 处输入需要检查，请查看标红字段。`}</div>}
        {hasCalculated && !result && Object.keys(errors).length === 0 && <p className={styles.taxOnlyNotice} role="status">参数已修改，请重新计算。原结果已清除。</p>}
        <div className={styles.actions}><button className={styles.submit} type="submit">计算工资 <span aria-hidden="true">→</span></button><p>计算仅在当前浏览器内完成，输入不会上传。</p></div>
      </form>
    </section>
    {result && <SalaryResults result={result} mode={form.mode} regionName={selectedRegionName} />}
  </div>;
}
