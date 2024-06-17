import Table from "cli-table3";
import { SecurityMarketDataFragment } from "src/__generated__/sdk";
import {
  renderDate,
  renderPrice,
  renderPriceChange,
  renderQuantityChange,
} from "src/render/cells";
import { WSOrderStatus } from "src/types/wealthsimple";

export type TradeTableRow = {
  symbol: string;
  name: string;
  quantity: number;
  limitPrice: number;
};

export type TradeTableData = {
  trades: TradeTableRow[];
};

export function renderTradeTable(args: {
  accountName: string;
  securityMarketData: ReadonlyMap<string, SecurityMarketDataFragment>;
  tableData: TradeTableData;
}) {
  const {
    accountName,
    securityMarketData,
    tableData: { trades },
  } = args;
  const table = new Table({
    style: { head: ["magenta"] },
    head: ["Symbol", "Name", "Bid", "Ask", "Limit", "Quantity", "Amount"],
  });
  for (const trade of trades) {
    const { symbol, name, quantity, limitPrice } = trade;
    const security = securityMarketData.get(symbol);
    if (!security) {
      throw new Error(`Unable to find quote for ${symbol}`);
    }
    const { bid, ask } = security.quote;
    table.push([
      symbol,
      name,
      renderPrice(Number(bid)),
      renderPrice(Number(ask)),
      renderPrice(limitPrice),
      renderQuantityChange(quantity, { round: false }),
      renderPriceChange(quantity * limitPrice),
    ]);
  }
  return accountName + "\n" + table.toString();
}

export type TradeHistoryTableRow = {
  createdAt: Date;
  symbol: string;
  name: string;
  quantity: number;
  limitPrice: number;
  status: WSOrderStatus;
};

export type TradeHistoryTableData = {
  securityMarketData: ReadonlyMap<string, SecurityMarketDataFragment>;
  trades: TradeHistoryTableRow[];
};

export function renderTradeHistoryTable(args: {
  accountName: string;
  tableData: TradeHistoryTableData;
}) {
  const {
    accountName,
    tableData: { trades, securityMarketData },
  } = args;
  const table = new Table({
    style: { head: ["magenta"] },
    head: [
      "Date",
      "Symbol",
      "Name",
      "Bid",
      "Ask",
      "Limit",
      "Quantity",
      "Amount",
      "Status",
    ],
  });
  for (const trade of trades) {
    const { createdAt, symbol, name, limitPrice, quantity, status } = trade;
    const security = securityMarketData.get(symbol);
    if (!security) {
      throw new Error(`Unable to find quote for ${symbol}`);
    }
    const {
      quote: { bid, ask },
    } = security;
    table.push([
      renderDate(createdAt),
      symbol,
      name,
      renderPrice(Number(bid)),
      renderPrice(Number(ask)),
      renderPrice(limitPrice),
      renderQuantityChange(quantity, { round: false }),
      renderPriceChange(quantity * limitPrice),
      status,
    ]);
  }
  return accountName + "\n" + table.toString();
}
