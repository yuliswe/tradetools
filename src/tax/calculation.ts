const federalTaxBrackets = [
  {
    below: 55867,
    rate: 0.15,
  },
  {
    below: 111733,
    rate: 0.205,
  },
  {
    below: 173205,
    rate: 0.26,
  },
  {
    below: 246752,
    rate: 0.29,
  },
  {
    below: Infinity,
    rate: 0.33,
  },
];

const ontarioIncomeTaxBrackets = [
  {
    below: 51446,
    rate: 0.0505,
  },
  {
    below: 102894,
    rate: 0.0915,
  },
  {
    below: 150000,
    rate: 0.1116,
  },
  {
    below: 220000,
    rate: 0.1216,
  },
  {
    below: Infinity,
    rate: 0.1316,
  },
];

export function calculateIncomeTax(args: {
  employmentIncome: number;
  rrspDeduction: number;
  capitalGains: number;
}) {
  const { employmentIncome, rrspDeduction, capitalGains } = args;
  const totalTaxableIncome = employmentIncome + capitalGains - rrspDeduction;
  const federalTax = calculateTax(totalTaxableIncome, federalTaxBrackets);
  const ontarioTax = calculateTax(totalTaxableIncome, ontarioIncomeTaxBrackets);
  return {
    federalTax,
    ontarioTax,
  };
}

function calculateTax(
  income: number,
  brackets: { below: number; rate: number }[]
) {
  let tax = 0;
  let remainingIncome = income;
  let taxedSoFar = 0;
  for (const bracket of brackets) {
    const { below, rate } = bracket;
    if (remainingIncome <= 0) {
      break;
    }
    const bracketSize = Math.min(remainingIncome, below - taxedSoFar);
    tax += bracketSize * rate;
    remainingIncome -= bracketSize;
    taxedSoFar += bracketSize;
  }
  return tax;
}

export function findMarginalTaxRates(income: number) {
  return {
    federal: findMarginalTaxInBracket(income, federalTaxBrackets),
    ontario: findMarginalTaxInBracket(income, ontarioIncomeTaxBrackets),
  };
}

function findMarginalTaxInBracket(
  income: number,
  brackets: { below: number; rate: number }[]
) {
  for (const bracket of brackets) {
    if (income < bracket.below) {
      return bracket.rate;
    }
  }
  return brackets[brackets.length - 1].rate;
}
