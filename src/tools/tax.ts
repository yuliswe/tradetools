import { Command } from "commander";
import { plot } from "nodeplotlib";
import { calculateIncomeTax, findMarginalTaxRates } from "src/tax/calculation";

export const rrspCmd = () =>
  new Command("tax")
    .argument("<income>", "Total employment incoe")
    .action((income: string) => {
      const employmentIncome = Number(income);

      const incomeAxis = new Array(120)
        .fill(null)
        .map((_, i) => i * (employmentIncome / 100));

      plot([
        {
          x: incomeAxis,
          y: incomeAxis.map((employmentIncome) => {
            const { federalTax, ontarioTax } = calculateIncomeTax({
              employmentIncome,
              rrspDeduction: 0,
              capitalGains: 0,
            });
            return (federalTax + ontarioTax) / employmentIncome;
          }),
          name: "Total Tax Rate",
          mode: "lines",
          type: "scatter",
        },
        {
          x: incomeAxis,
          y: incomeAxis.map((employmentIncome) => {
            const { federal, ontario } = findMarginalTaxRates(employmentIncome);
            return federal + ontario;
          }),
          name: "Marginal Tax Rate",
          mode: "lines",
          type: "scatter",
        },
      ]);

      const deductionAxis = new Array(120)
        .fill(null)
        .map((_, i) => i * ((employmentIncome * 0.18) / 100));
      plot(
        [
          {
            x: deductionAxis,
            y: deductionAxis.map((rrspDeduction) => {
              const originalTax = calculateIncomeTax({
                employmentIncome,
                rrspDeduction: 0,
                capitalGains: 0,
              });
              const taxAfterRRSP = calculateIncomeTax({
                employmentIncome,
                rrspDeduction,
                capitalGains: 0,
              });
              const rrspTaxSavings =
                originalTax.federalTax -
                taxAfterRRSP.federalTax +
                originalTax.ontarioTax -
                taxAfterRRSP.ontarioTax;
              return Number(rrspTaxSavings.toFixed(2));
            }),
            mode: "lines",
            type: "scatter",
          },
        ],
        {
          title: `RRSP Tax Savings at ${employmentIncome} Income`,
          xaxis: {
            title: "RRSP Deduction",
          },
          yaxis: {
            title: "Tax Savings",
          },
        }
      );

      plot(
        [
          {
            x: deductionAxis,
            y: deductionAxis.map((rrspDeduction) => {
              const originalTax = calculateIncomeTax({
                employmentIncome,
                rrspDeduction: 0,
                capitalGains: 0,
              });
              const taxAfterRRSP = calculateIncomeTax({
                employmentIncome,
                rrspDeduction,
                capitalGains: 0,
              });
              const rrspTaxSavings =
                originalTax.federalTax -
                taxAfterRRSP.federalTax +
                originalTax.ontarioTax -
                taxAfterRRSP.ontarioTax;
              const rate = rrspTaxSavings / rrspDeduction;
              return Number(rate.toFixed(4));
            }),
            mode: "lines",
            type: "scatter",
          },
        ],
        {
          title: `Average Tax Savings / $1 Deduction at ${employmentIncome} Income`,
          xaxis: {
            title: "RRSP Deduction",
          },
          yaxis: {
            title: "Tax Savings / Deduction",
          },
        }
      );

      plot(
        [
          {
            x: deductionAxis,
            y: deductionAxis.map((rrspDeduction) => {
              const originalTax = calculateIncomeTax({
                employmentIncome,
                rrspDeduction,
                capitalGains: 0,
              });
              const taxAfterRRSP = calculateIncomeTax({
                employmentIncome,
                rrspDeduction: rrspDeduction + 1,
                capitalGains: 0,
              });
              const rrspTaxSavings =
                originalTax.federalTax -
                taxAfterRRSP.federalTax +
                originalTax.ontarioTax -
                taxAfterRRSP.ontarioTax;
              return Number(rrspTaxSavings.toFixed(4));
            }),
            mode: "lines",
            type: "scatter",
          },
        ],
        {
          title: `Marginal Tax Deduction / $1 Deduction at ${employmentIncome} Income`,
          xaxis: {
            title: "RRSP Deduction",
          },
          yaxis: {
            title: "Marginal Tax Savings",
          },
        }
      );
    });

const program = rrspCmd();
program.parse(process.argv);
