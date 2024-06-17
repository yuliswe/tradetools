import chalk from "chalk";
import { Command } from "commander";
import { println } from "src/cli/console";
import { createCommand } from "src/cli/utils";
import { renderTradeTable } from "src/render/trade";
import { tiChecker } from "src/tiChecker";

import type { CliSellCommandOptions } from "src/types/cliOptions";
import { WSOrderType } from "src/types/wealthsimple";
import { WealthsimpleAPI } from "src/wealthsimple/WeathsimpleAPI";
import { getSecurityMarketDataFromPositions } from "src/wealthsimple/portfolio";

export const createSellCommand = (program: Command) =>
  createCommand({
    name: "sell",
    summary: "Sell securities",
    description: "Sell securities",
  })
    .argument("<symbol>", "Security Symbol")
    .option("--cad <cad>", "CAD amount to sell", Number)
    .option("-y --yes", "Confirm trade")
    .action((symbol: string, options: unknown) =>
      sellCommand({
        symbol,
        options: tiChecker.CliSellCommandOptions.strictFrom(options),
      })
    );

export const sellCommand = async (args: {
  symbol: string;
  options: CliSellCommandOptions;
}) => {
  const { symbol, options } = args;

  const wealthsimple = new WealthsimpleAPI();
  await wealthsimple.authenticate();

  const accounts = await wealthsimple.fetchAllAccountFinancials();
  const positions = await wealthsimple.fetchPositions();
  const securityMarketData = await getSecurityMarketDataFromPositions({
    wealthsimple,
    positions,
  });
  const tfsaAccountId = accounts.find((x) => x.id.includes("tfsa"))!.id;
  //   const tfsaAccountFinancials = accountFinancials.get(tfsaAccountId)!;
  //   const tfsaPositions = accountPositions.get(tfsaAccountId)!;

  const rrspAccountId = accounts.find((x) => x.id.includes("rrsp"))!.id;
  //   const rrspAccountFinancials = accountFinancials.get(rrspAccountId)!;
  //   const rrspPositions = accountPositions.get(rrspAccountId)!;

  const securityToSell = securityMarketData.get(symbol);
  if (!securityToSell) {
    throw new Error(`Unable to find quote for ${symbol}`);
  }

  const {
    id: securityId,
    stock: { name },
  } = securityToSell;

  let quantity: number | undefined;
  const limitPrice = Number(securityToSell.quote.bid);
  if (options.cad) {
    quantity = Math.round(options.cad / limitPrice);
  }

  if (quantity === undefined) {
    throw new Error("Quantity must be defined");
  }

  println(
    renderTradeTable({
      accountName: tfsaAccountId,
      securityMarketData,
      tableData: {
        trades: [
          {
            symbol,
            name,
            quantity: -quantity,
            limitPrice,
          },
        ],
      },
    })
  );

  if (options.yes) {
    await wealthsimple.trade({
      accountId: tfsaAccountId,
      securityId,
      quantity,
      limitPrice,
      orderType: WSOrderType.SELL_QUANTITY,
    });
    println(chalk.green("Trades submitted."));
  } else {
    println(chalk.yellow('Run again with "--yes" to commit the trade.'));
  }
};
