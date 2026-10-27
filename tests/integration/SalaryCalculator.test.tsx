import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import SalaryCalculator from "@/components/SalaryCalculator";

afterEach(cleanup);

describe("SalaryCalculator", () => {
  it("clears all unverified regional rates and restores Shanghai presets on return", () => {
    render(<SalaryCalculator />);
    fireEvent.change(screen.getByLabelText("税前月薪（元）"), { target: { value: "8000" } });
    fireEvent.change(screen.getByLabelText("省份"), { target: { value: "330000" } });
    fireEvent.change(screen.getByLabelText("城市"), { target: { value: "330100" } });
    for (const name of ["个人养老比例（%）", "个人医疗比例（%）", "个人失业比例（%）", "1—6 月个人公积金比例（%）", "7—12 月个人公积金比例（%）"])
      expect(screen.getByLabelText(name)).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));
    expect(screen.queryByRole("region", { name: "计算结果" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("省份"), { target: { value: "310000" } });
    expect(screen.getByLabelText("1—6 月个人公积金比例（%）")).toHaveValue("7");
    expect(screen.getByLabelText("7—12 月个人公积金比例（%）")).toHaveValue("7");
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));
    expect(screen.getByLabelText("全年个人缴费")).toHaveTextContent("16,800.00");
  });
  it("starts with detailed Shanghai defaults and links bases to the entered salary", () => {
    render(<SalaryCalculator />);

    expect(screen.getByRole("radio", { name: /含个人缴费估算/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: "按工资" })).toBeChecked();
    fireEvent.change(screen.getByRole("textbox", { name: "税前月薪（元）" }), { target: { value: "8000" } });

    expect(screen.getByRole("textbox", { name: "公积金缴费基数（元）" })).toHaveValue("8000");
    expect(screen.queryByRole("textbox", { name: "自定义社保缴纳基数（元）" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "1—6 月个人公积金比例（%）" })).toHaveValue("7");
    expect(screen.getByRole("textbox", { name: "7—12 月个人公积金比例（%）" })).toHaveValue("7");
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));
    expect(screen.getByLabelText("全年个人缴费")).toHaveTextContent("16,800.00");
  });

  it("accepts a July base change and focuses the results after calculation", () => {
    render(<SalaryCalculator />);
    fireEvent.change(screen.getByLabelText("税前月薪（元）"), { target: { value: "8000" } });
    fireEvent.click(screen.getByRole("radio", { name: /含个人缴费估算/ }));
    fireEvent.click(screen.getByRole("radio", { name: "自定义" }));
    for (const [name, value] of [
      ["自定义社保缴纳基数（元）", "8000"], ["公积金缴费基数（元）", "8000"],
      ["1—6 月个人公积金比例（%）", "7"], ["7—12 月个人公积金比例（%）", "7"],
    ]) fireEvent.change(screen.getByLabelText(name), { target: { value } });
    fireEvent.click(screen.getByRole("checkbox", { name: /7 月起缴费基数调整/ }));
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));
    expect(screen.getByLabelText("7—12 月社保缴纳基数（元）")).toHaveAttribute("aria-invalid", "true");
    for (const name of ["7—12 月社保缴纳基数（元）", "7—12 月公积金缴费基数（元）"])
      fireEvent.change(screen.getByLabelText(name), { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));
    expect(screen.getByLabelText("全年个人缴费")).toHaveTextContent("18,900.00");
    expect(screen.getByRole("heading", { name: "全年一览" })).toHaveFocus();
    fireEvent.click(screen.getByRole("checkbox", { name: /7 月起缴费基数调整/ }));
    expect(screen.queryByRole("region", { name: "计算结果" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/重新计算/);
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));
    expect(screen.getByLabelText("全年个人缴费")).toHaveTextContent("16,800.00");
  });
  it("calculates cumulative annual tax when the user chooses tax-only mode", () => {
    render(<SalaryCalculator />);

    fireEvent.change(screen.getByRole("textbox", { name: "税前月薪（元）" }), {
      target: { value: "8000" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /仅算个税/ }));
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));

    const result = screen.getByRole("region", { name: "计算结果" });
    expect(within(result).getByText("仅算个税，未扣五险一金")).toBeInTheDocument();
    expect(within(result).getByLabelText("全年预扣个税")).toHaveTextContent("1,080.00");
    expect(within(result).getAllByRole("row")).toHaveLength(13);
  });

  it("calculates selected special deductions and shows their annual total", () => {
    render(<SalaryCalculator />);

    fireEvent.change(screen.getByRole("textbox", { name: "税前月薪（元）" }), { target: { value: "8000" } });
    fireEvent.click(screen.getByRole("radio", { name: /仅算个税/ }));
    fireEvent.click(screen.getByRole("button", { name: "其他扣除与免税收入" }));
    fireEvent.click(screen.getByRole("radio", { name: "包含专项附加扣除" }));
    fireEvent.change(screen.getByRole("textbox", { name: "子女教育（月额，元）" }), { target: { value: "1000" } });
    fireEvent.change(screen.getByRole("textbox", { name: "住房租金（月额，元）" }), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));

    const result = screen.getByRole("region", { name: "计算结果" });
    expect(within(result).getByLabelText("全年专项附加扣除")).toHaveTextContent("18,000.00");
    expect(within(result).getByLabelText("全年预扣个税")).toHaveTextContent("540.00");
  });

  it("focuses the first invalid field and explains a missing monthly salary", () => {
    render(<SalaryCalculator />);

    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));

    const salary = screen.getByRole("textbox", { name: "税前月薪（元）" });
    expect(salary).toHaveFocus();
    expect(salary).toHaveAttribute("aria-invalid", "true");
    expect(salary).toHaveAccessibleDescription(/请输入税前月薪/);
    expect(screen.queryByRole("region", { name: "计算结果" })).not.toBeInTheDocument();
  });

  it("requires Shanghai bases and both housing rates in detailed mode", () => {
    render(<SalaryCalculator />);

    fireEvent.change(screen.getByRole("textbox", { name: "税前月薪（元）" }), {
      target: { value: "30000" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /含个人缴费估算/ }));
    fireEvent.click(screen.getByRole("radio", { name: "自定义" }));
    for (const name of ["自定义社保缴纳基数（元）", "公积金缴费基数（元）", "1—6 月个人公积金比例（%）", "7—12 月个人公积金比例（%）"])
      fireEvent.change(screen.getByRole("textbox", { name }), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));

    for (const name of [
      "自定义社保缴纳基数（元）",
      "公积金缴费基数（元）",
      "1—6 月个人公积金比例（%）",
      "7—12 月个人公积金比例（%）",
    ]) {
      expect(screen.getByRole("textbox", { name })).toHaveAttribute("aria-invalid", "true");
    }
    expect(screen.queryByRole("region", { name: "计算结果" })).not.toBeInTheDocument();
  });

  it("uses the verified Shanghai minimum when the minimum social base is selected", () => {
    render(<SalaryCalculator />);

    fireEvent.change(screen.getByRole("textbox", { name: "税前月薪（元）" }), { target: { value: "8000" } });
    fireEvent.click(screen.getByRole("radio", { name: "按最低标准" }));
    expect(screen.getByRole("radio", { name: "按最低标准" })).toBeChecked();
    expect(screen.getByText(/1—6 月 7460 元，7—12 月 7546 元/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));

    expect(screen.getByLabelText("全年个人缴费")).toHaveTextContent("16,173.78");
    expect(screen.getByLabelText("本月社保有效基数")).toHaveTextContent("7,546.00");
  });

  it("switches from the Shanghai minimum to custom when another region is selected", () => {
    render(<SalaryCalculator />);

    fireEvent.click(screen.getByRole("radio", { name: "按最低标准" }));
    fireEvent.change(screen.getByRole("combobox", { name: "省份" }), { target: { value: "330000" } });
    fireEvent.change(screen.getByRole("combobox", { name: "城市" }), { target: { value: "330100" } });

    expect(screen.getByRole("radio", { name: "按最低标准" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "自定义" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "自定义社保缴纳基数（元）" })).toBeInTheDocument();
  });

  it("shows when a custom Shanghai base is raised to the policy minimum", () => {
    render(<SalaryCalculator />);
    fireEvent.change(screen.getByRole("textbox", { name: "税前月薪（元）" }), { target: { value: "8000" } });
    fireEvent.click(screen.getByRole("radio", { name: "自定义" }));
    fireEvent.change(screen.getByRole("textbox", { name: "自定义社保缴纳基数（元）" }), { target: { value: "1000" } });
    fireEvent.change(screen.getByRole("textbox", { name: "公积金缴费基数（元）" }), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));

    expect(screen.getByLabelText("本月社保有效基数")).toHaveTextContent("7,546.00");
    expect(screen.getByLabelText("本月公积金有效基数")).toHaveTextContent("2,740.00");
    expect(screen.getAllByText("已按缴费下限调整")).toHaveLength(2);
  });

  it("keeps edited monthly wages when the base salary changes", () => {
    render(<SalaryCalculator />);

    fireEvent.click(screen.getByRole("checkbox", { name: /每月工资不同/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "税前月薪（元）" }), {
      target: { value: "8000" },
    });
    const january = screen.getByRole("textbox", { name: "1 月工资（元）" });
    const february = screen.getByRole("textbox", { name: "2 月工资（元）" });
    expect(january).toHaveValue("8000");
    expect(february).toHaveValue("8000");

    fireEvent.change(january, { target: { value: "9000" } });
    fireEvent.change(screen.getByRole("textbox", { name: "税前月薪（元）" }), {
      target: { value: "10000" },
    });
    expect(january).toHaveValue("9000");
    expect(february).toHaveValue("10000");
  });

  it("does not estimate custom-city contributions until every personal rate is entered", () => {
    render(<SalaryCalculator />);

    fireEvent.change(screen.getByRole("textbox", { name: "税前月薪（元）" }), {
      target: { value: "10000" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /含个人缴费估算/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "省份" }), {
      target: { value: "330000" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "城市" }), {
      target: { value: "330100" },
    });
    expect(screen.getByText(/浙江省 · 杭州市 的地方费率/)).toBeInTheDocument();
    for (const name of ["个人养老比例（%）", "个人医疗比例（%）", "个人失业比例（%）"])
      fireEvent.change(screen.getByRole("textbox", { name }), { target: { value: "" } });
    for (const [name, value] of [
      ["公积金缴费基数（元）", "8000"],
      ["1—6 月个人公积金比例（%）", "7"],
      ["7—12 月个人公积金比例（%）", "7"],
    ]) {
      fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
    }
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));

    for (const name of ["个人养老比例（%）", "个人医疗比例（%）", "个人失业比例（%）"]) {
      expect(screen.getByRole("textbox", { name })).toHaveAttribute("aria-invalid", "true");
    }
    expect(screen.queryByRole("region", { name: "计算结果" })).not.toBeInTheDocument();
  });

  it("calculates for a selected non-Shanghai city using only entered local rates", () => {
    render(<SalaryCalculator />);
    fireEvent.change(screen.getByRole("textbox", { name: "税前月薪（元）" }), { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("radio", { name: /含个人缴费估算/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "省份" }), { target: { value: "330000" } });
    fireEvent.change(screen.getByRole("combobox", { name: "城市" }), { target: { value: "330100" } });
    fireEvent.click(screen.getByRole("radio", { name: "自定义" }));
    for (const [name, value] of [
      ["自定义社保缴纳基数（元）", "1000"], ["公积金缴费基数（元）", "1000"],
      ["个人养老比例（%）", "8"], ["个人医疗比例（%）", "2"], ["个人失业比例（%）", "0.5"],
      ["1—6 月个人公积金比例（%）", "12"], ["7—12 月个人公积金比例（%）", "12"],
    ]) fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));
    const result = screen.getByRole("region", { name: "计算结果" });
    expect(within(result).getByText(/浙江省 · 杭州市 的地方缴费参数未自动核实/)).toBeInTheDocument();
    expect(within(result).getByText("本月个人缴费").parentElement).toHaveTextContent("225.00 元");
    expect(within(result).getByText(/自定义地区的缴费基数和费率均为用户手填/)).toBeInTheDocument();
  });

  it("lets users select a province, city, and district", async () => {
    render(<SalaryCalculator />);

    expect(screen.getByText("选择地区")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "省份" }), { target: { value: "330000" } });
    fireEvent.change(screen.getByRole("combobox", { name: "城市" }), { target: { value: "330100" } });
    await screen.findByRole("option", { name: "西湖区" });
    fireEvent.change(screen.getByRole("combobox", { name: "区县" }), { target: { value: "330106" } });
    fireEvent.change(screen.getByRole("textbox", { name: "税前月薪（元）" }), { target: { value: "10000" } });
    fireEvent.click(screen.getByRole("radio", { name: /仅算个税/ }));
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));

    expect(screen.getByText(/浙江省 · 杭州市 · 西湖区 · 测算结果/)).toBeInTheDocument();
  });

  it("shows selected-month contributions after a valid Shanghai detailed calculation", () => {
    render(<SalaryCalculator />);

    fireEvent.change(screen.getByRole("textbox", { name: "税前月薪（元）" }), {
      target: { value: "8000" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /含个人缴费估算/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "本单位入职月份" }), {
      target: { value: "5" },
    });
    for (const [name, value] of [
      ["公积金缴费基数（元）", "8000"],
      ["1—6 月个人公积金比例（%）", "7"],
      ["7—12 月个人公积金比例（%）", "7"],
    ]) {
      fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
    }
    fireEvent.click(screen.getByRole("button", { name: "计算工资" }));

    const result = screen.getByRole("region", { name: "计算结果" });
    expect(within(result).getByLabelText("全年个人缴费")).toHaveTextContent("11,200.00");
    fireEvent.change(within(result).getByRole("combobox", { name: "查看月份" }), {
      target: { value: "4" },
    });
    expect(within(result).getByText("本月个人缴费").parentElement).toHaveTextContent("0.00 元");
    fireEvent.change(within(result).getByRole("combobox", { name: "查看月份" }), {
      target: { value: "5" },
    });
    expect(within(result).getByText("本月个人缴费").parentElement).toHaveTextContent("1,400.00 元");
    expect(within(result).getByText("本月个人缴费明细")).toBeInTheDocument();
  });
});
