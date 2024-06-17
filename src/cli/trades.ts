import { Command } from "commander";
import { println } from "src/cli/console";
import { createCommand } from "src/cli/utils";
import {
  TradeHistoryTableRow,
  renderTradeHistoryTable,
} from "src/render/trade";
import { CliTradesCommandOptions } from "src/types/cliOptions";
import { WSTradingActivity } from "src/types/wealthsimple";
import { asyncTakeNextN } from "src/utils/promise";
import { WealthsimpleAPI } from "src/wealthsimple/WeathsimpleAPI";
import { getSecurityMarketDataFromPositions } from "src/wealthsimple/portfolio";

export const createTradesCommand = (program: Command) =>
  createCommand({
    name: "trades",
    summary: "Print Wealthsimple trades",
    description: "Print Wealthsimple trades",
  }).action(tradesCommand);

export const tradesCommand = async (args: {
  options: CliTradesCommandOptions;
}) => {
  const wealthsimple = new WealthsimpleAPI();
  await wealthsimple.authenticate();
  const positions = await wealthsimple.fetchPositions();
  const tradesIter = wealthsimple.listTrades();
  const trades = await asyncTakeNextN(10, tradesIter);
  println(
    renderTradeHistoryTable({
      accountName: "Wealthsimple",
      tableData: {
        securityMarketData: await getSecurityMarketDataFromPositions({
          wealthsimple,
          positions,
        }),
        trades: trades.map((trade: WSTradingActivity): TradeHistoryTableRow => {
          const {
            symbol,
            security_name,
            quantity,
            limit_price,
            created_at,
            status,
          } = trade;
          return {
            symbol,
            name: security_name,
            createdAt: new Date(created_at),
            quantity,
            limitPrice: Number(limit_price?.amount),
            status,
          };
        }),
      },
    })
  );
};
