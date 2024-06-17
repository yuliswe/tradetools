import chalk from "chalk";
import { Command } from "commander";
import { println } from "src/cli/console";
import { createCommand } from "src/cli/utils";
import { renderTradeTable } from "src/render/trade";
import { tiChecker } from "src/tiChecker";

import type { CliBuyCommandOptions } from "src/types/cliOptions";
import { WSOrderType } from "src/types/wealthsimple";
import { WealthsimpleAPI } from "src/wealthsimple/WeathsimpleAPI";
import { getSecurityMarketDataFromPositions } from "src/wealthsimple/portfolio";

export const createBuyCommand = (program: Command) =>
  createCommand({
    name: "buy",
    summary: "Buy securities",
    description: "Buy securities",
  })
    .argument("<symbol>", "Security Symbol")
    .option("--tsfa", "Buy into TSFA account")
    .option("--rrsp", "Buy into RRSP account")
    .option("--nonreg", "Buy into Non-registered account")
    .option("--cad <cad>", "CAD amount to buy", Number)
    .option("--fractional", "Buy fractional shares")
    .option("-y --yes", "Confirm trade")
    .action((symbol: string, options: unknown) =>
      buyCommand({
        symbol,
        options: tiChecker.CliBuyCommandOptions.strictFrom(options),
      })
    );

export const buyCommand = async (args: {
  symbol: string;
  options: CliBuyCommandOptions;
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

  const nonRegAccountId = accounts.find((x) =>
    x.id.includes("non-registered-c9SlDnPRDw")
  )!.id;

  const securityToBuy = securityMarketData.get(symbol);
  if (!securityToBuy) {
    throw new Error(`Unable to find quote for ${symbol}`);
  }

  const selectedAccountId = options.tsfa
    ? tfsaAccountId
    : options.rrsp
      ? rrspAccountId
      : options.nonreg
        ? nonRegAccountId
        : undefined;

  if (!selectedAccountId) {
    throw new Error("Account type must be specified.");
  }

  const {
    id: securityId,
    stock: { name },
  } = securityToBuy;

  const limitPrice = Number(securityToBuy.quote.ask);

  if (!options.cad) {
    throw new Error("CAD amount must be specified.");
  }

  const quantity = options.fractional
    ? options.cad / limitPrice
    : Math.round(options.cad / limitPrice);

  println(
    renderTradeTable({
      accountName: selectedAccountId,
      securityMarketData,
      tableData: {
        trades: [
          {
            symbol,
            name,
            quantity,
            limitPrice,
          },
        ],
      },
    })
  );

  if (options.yes) {
    if (options.fractional) {
      await wealthsimple.tradeFractional({
        accountId: selectedAccountId,
        securityId,
        expectedQuantity: quantity,
        buyAmount: options.cad,
      });
    } else {
      await wealthsimple.trade({
        accountId: selectedAccountId,
        securityId,
        quantity,
        limitPrice,
        orderType: WSOrderType.BUY_QUANTITY,
      });
    }
    println(chalk.green("Trades submitted."));
  } else {
    println(chalk.yellow('Run again with "--yes" to commit the trade.'));
  }
};
