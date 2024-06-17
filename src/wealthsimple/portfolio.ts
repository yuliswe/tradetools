import { DateTime } from "luxon";
import {
  ActivityFeedItemStatus,
  ActivityFeedItemSubType,
  ActivityFeedItemType,
  type ActivityFeedItem,
} from "src/__generated__/sdk";
import { WSPosition } from "src/types/wealthsimple";
import { asyncGetAll } from "src/utils/promise";
import {
  AccountFinancials,
  WealthsimpleAPI,
} from "src/wealthsimple/WeathsimpleAPI";

export async function getSecurityMarketDataFromPositions(args: {
  wealthsimple: WealthsimpleAPI;
  positions: WSPosition[];
}) {
  const { wealthsimple, positions } = args;
  const securityIds = positions.map((pos) => pos.id);
  return await wealthsimple.fetchSecuritiesMarketData({
    securityIds,
  });
}

export function groupPositionsByAccount(args: {
  positions: WSPosition[];
  accounts: AccountFinancials[];
}) {
  const { positions, accounts } = args;
  const accountPositions = new Map<string, WSPosition[]>(
    accounts.map((account) => [account.id, []])
  );
  for (const pos of positions) {
    const { account_id } = pos;
    if (!accountPositions.has(account_id)) {
      throw new Error(`Account ${account_id} not found`);
    }
    accountPositions.get(account_id)?.push(pos);
  }
  return accountPositions;
}

export async function fetchLastTradingDayRecurringBuys(args: {
  wealthsimple: WealthsimpleAPI;
}): Promise<ActivityFeedItem[]> {
  const { wealthsimple } = args;
  const now = DateTime.local();
  const isWeekend = now.weekday === 6 || now.weekday === 7;
  const lastTradingDay = now.minus({
    days:
      (
        {
          1: 3,
          6: 1,
          7: 2,
        } as Record<number, number | undefined>
      )[now.weekday] ?? 1,
  });
  const lastRecurranceBuyReference = isWeekend
    ? lastTradingDay
    : now.hour >= 16
      ? now
      : lastTradingDay;

  const yesterdayAccountActivities = await asyncGetAll(
    wealthsimple.fetchActivities({
      startDate: lastRecurranceBuyReference.startOf("day").toISO(),
      endDate: lastRecurranceBuyReference.endOf("day").toISO(),
      types: [ActivityFeedItemType.DiyBuy],
    })
  );
  return yesterdayAccountActivities.filter(
    (a) =>
      a.subType === ActivityFeedItemSubType.RecurringOrder &&
      a.status === ActivityFeedItemStatus.Filled &&
      a.type === ActivityFeedItemType.DiyBuy
  );
}
