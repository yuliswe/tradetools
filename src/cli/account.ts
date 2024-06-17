import chalk from "chalk";
import { Command } from "commander";
import { DateTime } from "luxon";
import { println } from "src/cli/console";
import { createCommand } from "src/cli/utils";
import {
  computeCombinedPositionTableData,
  computeMirrorAccountTableDelta,
  computePositionTableData,
  computeRebalanceTableData,
  renderCombinedPositionsTable,
  renderPositionsTable,
} from "src/render/account";
import { renderTradeTable } from "src/render/trade";
import { tiChecker } from "src/tiChecker";
import { CliAccountCommandOptions } from "src/types/cliOptions";
import { WSOrderType } from "src/types/wealthsimple";
import {
  AccountFinancials,
  WealthsimpleAPI,
} from "src/wealthsimple/WeathsimpleAPI";
import {
  fetchLastTradingDayRecurringBuys,
  getSecurityMarketDataFromPositions,
  groupPositionsByAccount,
} from "src/wealthsimple/portfolio";

export const createAccountCommand = (program: Command) =>
  createCommand({
    name: "account",
    summary: "Print Wealthsimple accounts",
    description: "Print Wealthsimple accounts",
  })
    .option("--rb, --rebalance", "Rebalance accounts")
    .option("-y --yes", "Confirm trade")
    .action((options: unknown) =>
      accountCommand({
        options: tiChecker.CliAccountCommandOptions.strictFrom(options),
      })
    );

async function accountCommand(args: { options: CliAccountCommandOptions }) {
  const { options } = args;
  const wealthsimple = new WealthsimpleAPI();
  await wealthsimple.authenticate();
  let accounts;
  try {
    accounts = await wealthsimple.fetchAllAccountFinancials();
  } catch {
    await wealthsimple.reauthenticate();
    accounts = await wealthsimple.fetchAllAccountFinancials();
  }
  const positions = await wealthsimple.fetchPositions();
  const accountPositions = groupPositionsByAccount({
    positions,
    accounts,
  });
  const securityMarketData = await getSecurityMarketDataFromPositions({
    wealthsimple,
    positions,
  });
  const accountFinancials = new Map<string, AccountFinancials>(
    accounts.map((account) => [account.id, account])
  );

  const yesterdayRecurringBuys = await fetchLastTradingDayRecurringBuys({
    wealthsimple,
  });

  const targetAdjustmentCompleteDate = DateTime.fromISO("2024-12-01");

  const tfsaAccountId = accounts.find((x) => x.id.includes("tfsa"))!.id;
  const tfsaAccountFinancials = accountFinancials.get(tfsaAccountId)!;
  const tfsaPositions = accountPositions.get(tfsaAccountId)!;
  const tfsaTableData = computePositionTableData({
    securityMarketData,
    account: tfsaAccountFinancials,
    positions: tfsaPositions,
    yesterdayRecurringBuys,
    dailyDeposit: 0,
    targetAdjustmentCompleteDate,
  });

  const rrspAccountId = accounts.find((x) => x.id.includes("rrsp"))!.id;
  const rrspAccountFinancials = accountFinancials.get(rrspAccountId)!;
  const rrspPositions = accountPositions.get(rrspAccountId)!;
  const rrspTableData = computePositionTableData({
    securityMarketData,
    account: rrspAccountFinancials,
    positions: rrspPositions,
    yesterdayRecurringBuys,
    dailyDeposit: 0,
    targetAdjustmentCompleteDate,
  });

  const nonRegAccountId = accounts.find((x) =>
    x.id.includes("non-registered-c9SlDnPRDw")
  )!.id;
  const nonRegAccountFinancials = accountFinancials.get(nonRegAccountId)!;
  const nonRegPositions = accountPositions.get(nonRegAccountId)!;
  const nonRegTableData = computePositionTableData({
    securityMarketData,
    account: nonRegAccountFinancials,
    positions: nonRegPositions,
    yesterdayRecurringBuys,
    dailyDeposit: 200,
    targetAdjustmentCompleteDate,
  });

  const combinedTableData = computeCombinedPositionTableData([
    tfsaTableData,
    rrspTableData,
    nonRegTableData,
  ]);

  println(
    renderCombinedPositionsTable({
      accountName: "COMBINED",
      tableData: combinedTableData,
    })
  );

  println(
    renderPositionsTable({
      accountName: tfsaAccountId,
      tableData: tfsaTableData,
    })
  );

  const rrspMirrorAccountTableTableDelta = computeMirrorAccountTableDelta({
    primaryAccount: tfsaTableData,
    mirrorAccount: rrspTableData,
  });

  println(
    renderPositionsTable({
      accountName: rrspAccountId,
      tableData: rrspMirrorAccountTableTableDelta,
    })
  );

  const nonRegMirrorAccountTableTableDelta = computeMirrorAccountTableDelta({
    primaryAccount: tfsaTableData,
    mirrorAccount: nonRegTableData,
  });

  println(
    renderPositionsTable({
      accountName: nonRegAccountId,
      tableData: nonRegMirrorAccountTableTableDelta,
    })
  );

  if (options.rebalance) {
    const rrspTradingTable = computeRebalanceTableData(
      rrspMirrorAccountTableTableDelta
    );
    println(
      renderTradeTable({
        accountName: rrspAccountId,
        securityMarketData,
        tableData: rrspTradingTable,
      })
    );

    const nonRegTradingTable = computeRebalanceTableData(
      nonRegMirrorAccountTableTableDelta
    );
    println(
      renderTradeTable({
        accountName: nonRegAccountId,
        securityMarketData,
        tableData: nonRegTradingTable,
      })
    );

    if (options.yes) {
      for (const trade of rrspTradingTable.trades) {
        const { symbol, quantity, limitPrice } = trade;
        const security = securityMarketData.get(symbol);
        if (!security) {
          throw new Error(`Quote not found for ${symbol}`);
        }
        await wealthsimple.trade({
          accountId: rrspAccountId,
          securityId: security.id,
          quantity: Math.round(Math.abs(quantity)),
          limitPrice,
          orderType:
            quantity > 0 ? WSOrderType.BUY_QUANTITY : WSOrderType.SELL_QUANTITY,
        });
      }
      println(chalk.green("Trades submitted."));
    } else {
      println(chalk.yellow('Run again with "--yes" to commit the trade.'));
    }
  }
}
