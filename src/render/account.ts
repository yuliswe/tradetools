import chalk from "chalk";
import Table from "cli-table3";
import { DateTime } from "luxon";
import {
  SecurityMarketDataFragment,
  type ActivityFeedItem,
} from "src/__generated__/sdk";
import { TradeTableRow } from "src/render/trade";
import { WSPosition } from "src/types/wealthsimple";
import { AccountFinancials } from "src/wealthsimple/WeathsimpleAPI";
import {
  renderPercentage,
  renderPercentageChange,
  renderPrice,
  renderPriceChange,
  renderQuantity,
  renderQuantityChange,
} from "./cells";

const dollarImpactAmount = 250;

function getDollarImpactValue(args: {
  dollarImpactAmount: number;
  bookValue: number;
  bookAverage: number;
  askingPrice: number;
  quantity: number;
}) {
  const { bookValue, bookAverage, askingPrice, quantity, dollarImpactAmount } =
    args;
  const addedQuantity = Math.round(dollarImpactAmount / askingPrice);
  const addedValue = addedQuantity * askingPrice;
  return (
    (bookValue + addedValue) / (addedQuantity + quantity) / bookAverage - 1
  );
}

const cashRate = 1;
const cashPercentageOfPortfolio = 0;
const securityRate =
  (1 - cashRate * cashPercentageOfPortfolio) / (1 - cashPercentageOfPortfolio);
const guidance = {
  MSFT: 0.1 * securityRate,
  COST: 0.1 * securityRate,
  XQQ: 0.1 * securityRate,
  HTA: 0.1 * securityRate,
  ZSP: 0.1 * securityRate,
  ZWT: 0.11 * securityRate,
  AMZN: 0.07 * securityRate,
  NVDA: 0.07 * securityRate,
  DOL: 0.06 * securityRate,
  WMT: 0.04 * securityRate,
  VISA: 0.03 * securityRate,
  MA: 0.03 * securityRate,
  XST: 0.03 * securityRate,
  HHL: 0.03 * securityRate,
  LULU: 0.01 * securityRate,
  AAPL: 0.02 * securityRate,
  CSAV: cashPercentageOfPortfolio * cashRate,
};

const mirrorIgnored = new Set<string>([]);

const guidanceSum = Number(
  Object.values(guidance)
    .reduce((a, b) => a + b, 0)
    .toFixed(2)
);
if (guidanceSum !== 1) {
  throw new Error(
    `Guidance percentages should sum to 1, got: ${guidanceSum}. ${JSON.stringify(guidance, null, 2)}`
  );
}

export type PositionTableRow = {
  symbol: string;
  name: string;
  quantity: number;
  bookAverage: number;
  marketValue: number;
  percentageOfPortfolio: number;
  lastPrice: number;
  askingPrice: number;
  biddingPrice: number;
  gainPercentage: number;
  totalGain: number;
  /**
   * How much percentage the position will change if we buy/sell $1000 worth of
   * the security
   */
  dollarImpact: number;
  guidancePercentage: number;
  guidanceDeltaAmount: number;
  guidanceDailyRecurringBuy: number;
  dailyRecurringBuy: number;
  /**
   * Difference between daily recurring buy and guidance daily recurring buy.
   */
  dailyRecurringBuyFix: number;
  numTradingDaysUntilTargetAjustmentCompleteDate: number;
};

export type PostionTableData = {
  account: AccountFinancials;
  positions: ReadonlyMap<string, PositionTableRow>;
  /** Sum of all securities market value, ie, cash on hand not included. */
  totalMarketValue: number;
  cash: number;
  /** Sum of all non-cash equivalent securities market value, ie, cash on hand
   * and CSAV not included.
   */
  totalInvested: number;
  /** cash + cash equivalent securities */
  totalCashEquivalents: number;
  totalCashEquivalentsAsPercentageOfPortfolio: number;
  /** Account liquidation value - lock-in amount */
  effectiveNetLiquidationValue: number;
  lockInAmount: number;
  dailyDeposit: number;
  /**
   * If an increase of position is required, specify a date on which you expect
   * the investment is complete, so that we can calculate the daily investment
   * amount.
   */
  targetAdjustmentCompleteDate?: DateTime;
};

export function computePositionTableData(args: {
  account: AccountFinancials;
  securityMarketData: ReadonlyMap<string, SecurityMarketDataFragment>;
  positions: WSPosition[];
  yesterdayRecurringBuys: ActivityFeedItem[];
  dailyDeposit: number;
  targetAdjustmentCompleteDate: DateTime;
}): PostionTableData {
  const {
    account,
    positions,
    securityMarketData,
    dailyDeposit,
    targetAdjustmentCompleteDate,
  } = args;
  const { netLiquidationValue } = account;
  // Number of trade days from now until target adjustment complete date. Each
  // week has 5 trade days.
  const diffDaysUnitlTargetAjustmentCompleteDate = Math.floor(
    targetAdjustmentCompleteDate.diffNow("days").days
  );
  const numTradingDaysUntilTargetAjustmentCompleteDate =
    diffDaysUnitlTargetAjustmentCompleteDate -
    Math.floor(diffDaysUnitlTargetAjustmentCompleteDate / 7) * 2;
  let totalMarketValue = 0;
  // hack: remove lock in amount from portfolio net liquidation value when
  // calculating percentage of portfolio
  const lockinStock = positions.find((p) => p.stock.symbol === "CASH");
  const lockInAmount = lockinStock ? Number(lockinStock.book_value.amount) : 0;
  const effectiveNetLiquidationValue = netLiquidationValue - lockInAmount;
  const yesterdayRecurringBuysBySecurityId = new Map<string, number>(
    args.yesterdayRecurringBuys
      .filter((x) => x.accountId === account.id)
      .map((x) => [x.securityId, Number(x.amount)])
  );
  const rows = new Map<string, PositionTableRow>();
  for (const wsp of positions) {
    const { id: securityId, stock, book_value, quantity } = wsp;
    const { symbol, name } = stock;
    if (symbol === "CASH") {
      // hack: ignore lock in amount
      continue;
    }
    const marketData = securityMarketData.get(symbol);
    if (!marketData) {
      throw new Error(`Quote for ${symbol} not found`);
    }
    const { quote } = marketData;
    const marketValue = Number(quote.last) * quantity;
    totalMarketValue += marketValue;
    const bookAverage = Number(book_value.amount) / quantity;
    const dollarImpact = getDollarImpactValue({
      dollarImpactAmount,
      bookValue: Number(book_value.amount),
      bookAverage,
      askingPrice: Number(quote.ask),
      quantity,
    });
    const percentageOfPortfolio = Number(
      (marketValue / effectiveNetLiquidationValue).toFixed(4)
    );
    const guidancePercentage =
      symbol in guidance ? guidance[symbol as keyof typeof guidance] : 0;
    const guidanceDeltaAmount =
      (guidancePercentage - percentageOfPortfolio) *
      effectiveNetLiquidationValue;
    const dailyRecurringBuy =
      yesterdayRecurringBuysBySecurityId.get(securityId) ?? 0;
    const guidanceDailyRecurringBuy =
      guidancePercentage * dailyDeposit +
      Math.max(
        0,
        guidanceDeltaAmount / numTradingDaysUntilTargetAjustmentCompleteDate
      );
    const dailyRecurringBuyFix = guidanceDailyRecurringBuy - dailyRecurringBuy;

    const row: PositionTableRow = {
      symbol,
      name,
      quantity,
      bookAverage,
      marketValue: Number(quote.last) * quantity,
      percentageOfPortfolio,
      lastPrice: Number(quote.last),
      gainPercentage: Number(quote.last) / bookAverage - 1,
      totalGain: marketValue - Number(book_value.amount),
      askingPrice: Number(quote.ask),
      biddingPrice: Number(quote.bid),
      dollarImpact,
      guidancePercentage,
      guidanceDeltaAmount,
      guidanceDailyRecurringBuy,
      dailyRecurringBuy,
      dailyRecurringBuyFix,
      numTradingDaysUntilTargetAjustmentCompleteDate,
    };
    rows.set(symbol, row);
  }
  const cash = effectiveNetLiquidationValue - totalMarketValue;
  const totalCashEquivalents = cash + (rows.get("CSAV")?.marketValue ?? 0);
  const totalInvested = effectiveNetLiquidationValue - totalCashEquivalents;

  return {
    account,
    positions: rows,
    totalMarketValue,
    cash,
    totalCashEquivalents,
    totalInvested,
    totalCashEquivalentsAsPercentageOfPortfolio:
      totalCashEquivalents / effectiveNetLiquidationValue,
    effectiveNetLiquidationValue,
    lockInAmount,
    dailyDeposit,
  };
}

export type CombinedPositionTableData = PostionTableData & {
  breakdown: Record<
    string,
    {
      netLiquidationValue: number;
      percentageOfPortfolio: number;
    }
  >;
};

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

export function computeCombinedPositionTableData(
  accounts: PostionTableData[]
): CombinedPositionTableData {
  const totalNetLiquidationValue = sum(
    accounts.map((a) => a.account.netLiquidationValue)
  );
  const totalEffectiveNetLiquidationValue = sum(
    accounts.map((a) => a.effectiveNetLiquidationValue)
  );

  const positions = new Map<string, PositionTableRow>();

  function combineRows(rows: PositionTableRow[]) {
    if (rows.length === 0) {
      throw new Error("Requires at least one row");
    }
    const { lastPrice } = rows[0];
    const quantity = sum(rows.map((r) => r.quantity));
    const marketValue = sum(rows.map((r) => r.marketValue));
    const totalGain = sum(rows.map((r) => r.totalGain));
    const bookAverage =
      sum(rows.map((r) => r.bookAverage * r.quantity)) / quantity;
    const gainPercentage = (lastPrice - bookAverage) / bookAverage;
    const percentageOfPortfolio =
      marketValue / totalEffectiveNetLiquidationValue;
    const combinedRow = Object.assign({}, ...rows, {
      quantity,
      bookAverage,
      marketValue,
      percentageOfPortfolio,
      lastPrice,
      gainPercentage,
      totalGain,
    }) as PositionTableRow;
    return combinedRow;
  }
  const uniquePositionSymbols = new Set<string>(
    accounts.flatMap((a) => Array.from(a.positions.keys()))
  );
  for (const symbol of uniquePositionSymbols) {
    const rows = accounts
      .map((a) => a.positions.get(symbol))
      .filter(Boolean) as PositionTableRow[];
    const combinedRow = combineRows(rows);
    positions.set(symbol, combinedRow);
  }
  const cash = sum(accounts.map((a) => a.cash));
  const totalCashEquivalents = sum(accounts.map((a) => a.totalCashEquivalents));
  const totalMarketValue = sum(accounts.map((a) => a.totalMarketValue));
  const totalNetDeposits = sum(accounts.map((a) => a.account.netDeposits));
  const totalInvested =
    totalEffectiveNetLiquidationValue - totalCashEquivalents;
  const totalLockInAmount = sum(accounts.map((a) => a.lockInAmount));
  return {
    account: {
      id: accounts.map((a) => a.account.id).join("+"),
      netLiquidationValue: totalNetLiquidationValue,
      netDeposits: totalNetDeposits,
    },
    positions,
    totalMarketValue,
    totalInvested,
    cash,
    effectiveNetLiquidationValue: totalEffectiveNetLiquidationValue,
    totalCashEquivalents,
    totalCashEquivalentsAsPercentageOfPortfolio:
      totalCashEquivalents / totalEffectiveNetLiquidationValue,
    lockInAmount: totalLockInAmount,
    breakdown: Object.fromEntries(
      accounts.map((a) => [
        a.account.id,
        {
          netLiquidationValue: a.account.netLiquidationValue,
          percentageOfPortfolio:
            a.effectiveNetLiquidationValue / totalEffectiveNetLiquidationValue,
        },
      ])
    ),
    dailyDeposit: sum(accounts.map((a) => a.dailyDeposit)),
  };
}

export function renderPositionsTable(args: {
  tableData: PostionTableData;
  accountName: string;
}): string {
  const { accountName, tableData } = args;
  const table = new Table({
    style: { head: ["cyan"] },
    head: [
      "Symbol",
      "Name",
      "Quantity",
      "Book Avg.",
      "Last",
      "Bid",
      "Ask",
      // `±B.A./$${dollarImpactAmount}`,
      "Gain %",
      "Total Gain",
      "Market Value",
      "Guidance %",
      "Actual %",
      "Guidance Fix",
      "Guidance\nDaily Buy",
      "Actual\nDaily Buy",
      "Daily\nBuy Fix",
      "Days",
    ],
  });
  const rows = Array.from(tableData.positions.values()).sort(
    (a, b) => b.percentageOfPortfolio - a.percentageOfPortfolio
  );
  for (const row of rows) {
    const {
      symbol,
      name,
      quantity,
      marketValue,
      percentageOfPortfolio,
      lastPrice,
      bookAverage,
      gainPercentage,
      totalGain,
      askingPrice,
      biddingPrice,
      guidanceDeltaAmount,
      guidancePercentage,
      numTradingDaysUntilTargetAjustmentCompleteDate,
      dailyRecurringBuy,
      guidanceDailyRecurringBuy,
      dailyRecurringBuyFix,
    } = row;
    table.push([
      symbol, // Symbol
      name, // Name
      renderQuantity(quantity), // Quantity
      renderPrice(bookAverage), // Book Avg.
      renderPrice(lastPrice), // Last
      renderPriceChange(biddingPrice - lastPrice), // Bid
      renderPriceChange(askingPrice - lastPrice), // Ask
      // renderPercentageChange(row.dollarImpact),
      renderPercentageChange(gainPercentage), // Gain %
      renderPriceChange(totalGain), // Total Gain
      renderPrice(marketValue), // Market Value
      renderPercentage(guidancePercentage), // Guidance %
      renderPercentage(percentageOfPortfolio), // Actual %
      renderPriceChange(guidanceDeltaAmount), // Guidance Fix
      renderPrice(guidanceDailyRecurringBuy), // Guidance Daily Buy
      renderPrice(dailyRecurringBuy), // Actual Daily Buy
      renderPriceChange(dailyRecurringBuyFix), // Daily Buy Fix
      numTradingDaysUntilTargetAjustmentCompleteDate.toFixed(), // Days
    ]);
  }

  table.push([
    chalk.bold(chalk.cyan("Invested")),
    { colSpan: 9, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.totalInvested))),
  ]);
  table.push([
    chalk.bold(chalk.cyan("Cash")),
    { colSpan: 9, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.cash))),
  ]);
  table.push([
    chalk.bold(chalk.cyan("Cash+CSAV")),
    { colSpan: 9, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.totalCashEquivalents))),
    chalk.bold(
      chalk.cyan(
        renderPercentage(tableData.totalCashEquivalentsAsPercentageOfPortfolio)
      )
    ),
  ]);
  table.push([
    chalk.bold(chalk.cyan("Balance")),
    { colSpan: 9, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.account.netLiquidationValue))),
  ]);
  return accountName + "\n" + table.toString();
}

export function renderCombinedPositionsTable(args: {
  tableData: CombinedPositionTableData;
  accountName: string;
}): string {
  const { accountName, tableData } = args;
  const { breakdown } = tableData;
  const table = new Table({
    style: { head: ["cyan"] },
    head: [
      "Symbol",
      "Name",
      "Quantity",
      "Book Avg.",
      "Last Price",
      "% Gain",
      "Total Gain",
      "Market Value",
      "% of Portfolio",
    ],
  });
  const rows = Array.from(tableData.positions.values()).sort(
    (a, b) => b.percentageOfPortfolio - a.percentageOfPortfolio
  );
  for (const row of rows) {
    const {
      symbol,
      name,
      quantity,
      marketValue,
      percentageOfPortfolio,
      lastPrice,
      bookAverage,
      gainPercentage,
      totalGain,
    } = row;
    table.push([
      symbol,
      name,
      renderQuantity(quantity),
      renderPrice(bookAverage),
      renderPrice(lastPrice),
      renderPercentageChange(gainPercentage),
      renderPriceChange(totalGain),
      renderPrice(marketValue),
      renderPercentage(percentageOfPortfolio),
    ]);
  }

  table.push([
    chalk.bold(chalk.cyan("Invested")),
    { colSpan: 6, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.totalInvested))),
  ]);
  table.push([
    chalk.bold(chalk.cyan("Cash")),
    { colSpan: 6, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.cash))),
  ]);
  table.push([
    chalk.bold(chalk.cyan("Cash+CSAV")),
    { colSpan: 6, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.totalCashEquivalents))),
    chalk.bold(
      chalk.cyan(
        renderPercentage(tableData.totalCashEquivalentsAsPercentageOfPortfolio)
      )
    ),
  ]);
  for (const [accountId, bkd] of Object.entries(breakdown)) {
    table.push([
      chalk.bold(chalk.cyan(accountId)),
      { colSpan: 6, content: "" },
      chalk.bold(chalk.cyan(renderPrice(bkd.netLiquidationValue))),
      chalk.bold(chalk.cyan(renderPercentage(bkd.percentageOfPortfolio))),
    ]);
  }
  table.push([
    chalk.bold(chalk.cyan("Balance")),
    { colSpan: 6, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.account.netLiquidationValue))),
  ]);
  return accountName + "\n" + table.toString();
}

export type AccountDeltaTableRow = PositionTableRow & {
  targetPercentageOfPortfolio: number;
  deltaPercentageOfPortfolio: number;
  deltaAmount: number;
  deltaQuantity: number;
};

export type MirrorAccountTableData = Omit<PostionTableData, "positions"> & {
  positions: ReadonlyMap<string, AccountDeltaTableRow>;
};

export function computeMirrorAccountTableDelta(args: {
  primaryAccount: PostionTableData;
  mirrorAccount: PostionTableData;
}): MirrorAccountTableData {
  const { primaryAccount, mirrorAccount } = args;
  const rows = new Map<string, AccountDeltaTableRow>();
  for (const [symbol, mirrorRow] of mirrorAccount.positions.entries()) {
    const { askingPrice, biddingPrice } = mirrorRow;
    const primaryRow = primaryAccount.positions.get(symbol);
    const deltaPercentageOfPortfolio =
      (primaryRow?.percentageOfPortfolio ?? 0) -
      mirrorRow.percentageOfPortfolio;
    let deltaAmount =
      mirrorAccount.effectiveNetLiquidationValue * deltaPercentageOfPortfolio;
    if (mirrorIgnored.has(symbol)) {
      deltaAmount = 0;
    }
    const row = {
      ...mirrorRow,
      deltaPercentageOfPortfolio,
      deltaAmount,
      deltaQuantity:
        deltaAmount / (deltaAmount >= 0 ? askingPrice : biddingPrice),
      targetPercentageOfPortfolio: primaryRow?.percentageOfPortfolio ?? 0,
    };
    rows.set(symbol, row);
  }
  for (const [symbol, primaryRow] of primaryAccount.positions.entries()) {
    const { askingPrice, biddingPrice } = primaryRow;
    if (!mirrorAccount.positions.has(symbol)) {
      let deltaAmount =
        mirrorAccount.effectiveNetLiquidationValue *
        primaryRow.percentageOfPortfolio;
      if (mirrorIgnored.has(symbol)) {
        deltaAmount = 0;
      }
      rows.set(symbol, {
        ...primaryRow,
        quantity: 0,
        bookAverage: 0,
        marketValue: 0,
        percentageOfPortfolio: 0,
        gainPercentage: 0,
        totalGain: 0,
        deltaAmount,
        targetPercentageOfPortfolio: primaryRow.percentageOfPortfolio,
        deltaPercentageOfPortfolio: primaryRow.percentageOfPortfolio,
        deltaQuantity:
          deltaAmount / (deltaAmount >= 0 ? askingPrice : biddingPrice),
      });
    }
  }
  return {
    ...mirrorAccount,
    positions: rows,
  };
}

export function renderMirrorAccountTable(args: {
  accountName: string;
  tableData: MirrorAccountTableData;
}): string {
  const { accountName, tableData } = args;
  const table = new Table({
    style: { head: ["cyan"] },
    head: [
      "Symbol",
      "Name",
      "Quantity",
      "Book Avg.",
      "Last Price",
      "% Gain",
      "Total Gain",
      "Market Value",
      "% of Portfolio",
      "Target % of Portfolio",
      "Fix %",
      "Fix Amount",
      "Fix Quantity",
    ],
  });
  const rows = Array.from(tableData.positions.values()).sort(
    (a, b) => b.percentageOfPortfolio - a.percentageOfPortfolio
  );
  for (const row of rows) {
    const {
      symbol,
      name,
      quantity,
      marketValue,
      percentageOfPortfolio,
      targetPercentageOfPortfolio,
      deltaPercentageOfPortfolio,
      deltaAmount,
      deltaQuantity,
      lastPrice,
      bookAverage,
      gainPercentage,
      totalGain,
    } = row;
    const primaryRow = tableData.positions.get(symbol);
    if (!primaryRow) {
      throw new Error(`Primary row for ${symbol} not found`);
    }
    table.push([
      symbol,
      name,
      renderQuantity(quantity),
      renderPrice(bookAverage),
      renderPrice(lastPrice),
      renderPercentageChange(gainPercentage),
      renderPriceChange(totalGain),
      renderPrice(marketValue),
      renderPercentage(percentageOfPortfolio),
      renderPercentage(targetPercentageOfPortfolio),
      renderPercentageChange(deltaPercentageOfPortfolio),
      renderPriceChange(deltaAmount),
      renderQuantityChange(deltaQuantity, { round: true }),
    ]);
  }
  table.push([
    chalk.bold(chalk.cyan("Invested")),
    { colSpan: 6, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.totalInvested))),
  ]);
  table.push([
    chalk.bold(chalk.cyan("Cash")),
    { colSpan: 6, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.cash))),
  ]);
  table.push([
    chalk.bold(chalk.cyan("Cash+CSAV")),
    { colSpan: 6, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.totalCashEquivalents))),
    chalk.bold(
      chalk.cyan(
        renderPercentage(tableData.totalCashEquivalentsAsPercentageOfPortfolio)
      )
    ),
  ]);
  table.push([
    chalk.bold(chalk.cyan("Lock-in")),
    { colSpan: 6, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.lockInAmount))),
  ]);
  table.push([
    chalk.bold(chalk.cyan("Effective")),
    { colSpan: 6, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.effectiveNetLiquidationValue))),
  ]);
  table.push([
    chalk.bold(chalk.cyan("Balance")),
    { colSpan: 6, content: "" },
    chalk.bold(chalk.cyan(renderPrice(tableData.account.netLiquidationValue))),
  ]);
  return accountName + "\n" + table.toString();
}

export function computeRebalanceTableData(diff: MirrorAccountTableData) {
  const trades: TradeTableRow[] = [];
  for (const [symbol, row] of diff.positions.entries()) {
    if (symbol === "CASH") {
      // hack to ignore lockin amount
      continue;
    }
    const { deltaQuantity, askingPrice, biddingPrice } = row;
    if (Math.round(deltaQuantity) === 0) {
      continue;
    }
    trades.push({
      symbol,
      name: row.name,
      quantity: deltaQuantity,
      limitPrice: deltaQuantity >= 0 ? askingPrice : biddingPrice,
    });
  }
  return { trades };
}
