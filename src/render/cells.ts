import chalk from "chalk";

export function renderPrice(val: number): string {
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function renderPercentage(val: number): string {
  return val.toLocaleString("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function renderPriceChange(val: number): string {
  const str = val.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "exceptZero",
  });
  if (val > 0) {
    return chalk.green(str);
  }
  if (val < 0) {
    return chalk.red(str);
  }
  return str;
}

export function renderPercentageChange(val: number): string {
  const str = val.toLocaleString("en-US", {
    style: "percent",
    signDisplay: "exceptZero",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (val > 0) {
    return chalk.green(str);
  }
  if (val < 0) {
    return chalk.red(str);
  }
  return str;
}

export function renderQuantity(val: number): string {
  return val.toFixed(1);
}

export function renderQuantityChange(
  val: number,
  opts: { round?: boolean }
): string {
  const { round = false } = opts;
  if (round) {
    val = Math.round(val);
  }
  const str = val.toLocaleString("en-US", {
    signDisplay: "exceptZero",
  });
  if (val > 0) {
    return chalk.green(str);
  }
  if (val < 0) {
    return chalk.red(str);
  }
  return str;
}

export function renderDate(date: Date): string {
  return date.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
