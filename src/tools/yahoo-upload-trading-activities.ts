import { tiChecker } from "../tiChecker";
import {
  WSActivity,
  WSDepositActivity,
  WSTradingActivity,
} from "../types/wealthsimple";
import {
  YHFetchFinanceAPIResponse,
  YHFetchTransactionsAPIResponse,
  YHPosition,
  YHTransaction,
} from "../types/yahoo";

const NEO_EXCHANGE_TICKERS = [
  "NNRG",
  "MCDS",
  "AMZN",
  "MSFT",
  "COST",
  "AAPL",
  "WMT",
];

const commonHeaders = {
  Accept: "*/*",
  "Accept-Language": "en-CA,en-US;q=0.7,en;q=0.3",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "no-cors",
  "Sec-Fetch-Site": "same-site",
};

async function getCrumb(args: { pfId: string }): Promise<string> {
  const { pfId } = args;
  const resp = await fetch(
    "https://query2.finance.yahoo.com/v1/test/getcrumb",
    {
      credentials: "include",
      headers: {
        ...commonHeaders,
        "Content-Type": "text/plain",
      },
      referrer: `https://finance.yahoo.com/portfolio/${pfId}/view/v2`,
      method: "GET",
      mode: "cors",
    }
  );
  const crumb = await resp.text();
  console.debug({ crumb });
  return crumb;
}

async function fetchFinance(args: {
  pfId: string;
}): Promise<YHFetchFinanceAPIResponse> {
  const { pfId } = args;

  const url = new URL(
    "https://query1.finance.yahoo.com/v7/finance/desktop/portfolio"
  );

  const params = new URLSearchParams({
    formatted: "true",
    lang: "en-US",
    region: "US",
    userId: "AI67JXWS64XUDKOUV7R5D3ADOQ",
    fields: "quoteType",
    pfIds: pfId,
    includeBetaVersion: "1",
  });

  url.search = params.toString();
  const response = await fetch(url.toString(), {
    credentials: "include",
    headers: {
      ...commonHeaders,
    },
    referrer: "https://finance.yahoo.com/__portfolioPoller-worker.js",
    method: "GET",
    mode: "cors",
  });
  return tiChecker.YHFetchFinanceAPIResponse.from(await response.json());
}

async function fetchTransactions(args: {
  positionId: string;
  pfId: string;
  pagingCount: number;
  pagingOffset: number;
}): Promise<YHFetchTransactionsAPIResponse> {
  const { positionId, pfId, pagingCount, pagingOffset } = args;
  const url = new URL(
    "https://iquery.finance.yahoo.com/ws/portfolio-api/v1/portfolio/transactions"
  );

  const params = new URLSearchParams({
    pfId,
    positionId,
    category: "trades",
    pagingCount: pagingCount.toString(),
    pagingOffset: pagingOffset.toString(),
  });

  url.search = params.toString();
  const response = await fetch(url.toString(), {
    credentials: "include",
    headers: {
      ...commonHeaders,
    },
    referrer: `https://finance.yahoo.com/portfolio/${pfId}/view/v2`,
    method: "GET",
    mode: "cors",
  });
  return tiChecker.YHFetchTransactionsAPIResponse.from(await response.json());
}

async function uploadTransaction(args: {
  positionId: string;
  pfId: string;
  wsTrade: WSTradingActivity;
  crumb: string;
}) {
  const { positionId, pfId, wsTrade, crumb } = args;
  type Body = {
    transaction: {
      pfId: string;
      type: "BUY" | "SELL" | "SHORT" | "COVER";
      date: string;
      quantity: number;
      comment: string;
      positionId: string;
      pricePerShare: number;
      commission: 0;
    };
    response: { currentPagingOffset: number; pagingCount: number };
  };
  const body: Body = {
    transaction: {
      pfId,
      type: wsTrade.order_type.toLowerCase().includes("buy") ? "BUY" : "SELL",
      date: wsTrade.filled_at!.split("T")[0].replace(/-/g, ""),
      quantity: wsTrade.fill_quantity!,
      comment: wsTrade.id,
      positionId,
      pricePerShare:
        Number(wsTrade.account_value!.amount) / Number(wsTrade.fill_quantity!),
      commission: 0,
    },
    response: { currentPagingOffset: 0, pagingCount: 10 },
  };
  await fetch(
    "https://iquery.finance.yahoo.com/ws/portfolio-api/v1/portfolio/transaction?",
    {
      credentials: "include",
      headers: {
        ...commonHeaders,
        "Content-Type": "application/json",
        "x-crumb": crumb,
      },
      referrer: `https://finance.yahoo.com/portfolio/${pfId}/view/v2`,
      body: JSON.stringify(body),
      method: "POST",
      mode: "cors",
    }
  );
}

async function uploadDeposit(args: {
  pfId: string;
  wsActivity: WSDepositActivity;
  crumb: string;
}) {
  const { pfId, wsActivity, crumb } = args;
  type Body = {
    transaction: {
      pfId: string;
      type: "DEPOSIT" | "WITHDRAWAL";
      date: string;
      quantity: number;
      currency: "CAD" | "USD";
      comment: string;
    };
    response: { currentPagingOffset: number; pagingCount: number };
  };
  const body: Body = {
    transaction: {
      pfId,
      type: "DEPOSIT",
      date: wsActivity.accepted_at.split("T")[0].replace(/-/g, ""),
      quantity: Number(wsActivity.value.amount),
      currency: wsActivity.value.currency,
      comment: wsActivity.id,
    },
    response: { currentPagingOffset: 0, pagingCount: 10 },
  };
  await fetch(
    "https://iquery.finance.yahoo.com/ws/portfolio-api/v1/portfolio/transaction?",
    {
      credentials: "include",
      headers: {
        ...commonHeaders,
        "Content-Type": "application/json",
        "x-crumb": crumb,
      },
      referrer: `https://finance.yahoo.com/portfolio/${pfId}/view/v2`,
      body: JSON.stringify(body),
      method: "POST",
      mode: "cors",
    }
  );
}

async function deleteTransaction(args: {
  id: string;
  pfId: string;
  positionId: string;
  type: "BUY" | "SELL" | "DEPOSIT" | "WITHDRAWAL";
  crumb: string;
}) {
  const { id, type, pfId, positionId, crumb } = args;

  const url = new URL(
    "https://iquery.finance.yahoo.com/ws/portfolio-api/v1/portfolio/transaction"
  );
  const params = new URLSearchParams({
    pfId,
    positionId,
    id,
    type,
    currentPagingOffset: "0",
    pagingCount: "10",
  });

  url.search = params.toString();

  await fetch(url.toString(), {
    credentials: "include",
    headers: {
      ...commonHeaders,
      "x-crumb": crumb,
    },
    referrer: `https://finance.yahoo.com/portfolio/${pfId}/view/v2`,
    method: "DELETE",
    mode: "cors",
  });
}

async function* transactionsIterator(args: {
  positionId: string;
  pfId: string;
}): AsyncIterable<YHTransaction> {
  const { positionId, pfId } = args;
  let pagingOffset = 0;
  const pagingCount = 100;
  let totalCount = 0;
  do {
    const json = await fetchTransactions({
      positionId,
      pfId,
      pagingCount,
      pagingOffset,
    });
    yield* json.transactions;
    pagingOffset += pagingCount;
    totalCount = json.totalCount;
  } while (pagingOffset < totalCount);
}

function getPositions(finance: YHFetchFinanceAPIResponse): YHPosition[] {
  return finance.finance.result[0].portfolios[0].positions.map(
    (pos: YHPosition): YHPosition => ({
      ...pos,
      symbol: pos.symbol.split(".").slice(0, -1).join("."),
    })
  );
}

function mapSymbolToPosId(positions: YHPosition[]) {
  const map = new Map<string, string>();
  for (const pos of positions) {
    map.set(pos.symbol, pos.posId);
  }
  return map;
}

function groupBySymbol(trades: WSTradingActivity[]) {
  const map = new Map<string, WSTradingActivity[]>();
  for (const trade of trades) {
    const { symbol } = trade;
    const newArr = map.get(symbol) ?? [];
    newArr.push(trade);
    map.set(symbol, newArr);
  }
  return map;
}

async function fetchAllTransactions(args: {
  positionId: string;
  pfId: string;
}): Promise<YHTransaction[]> {
  const { positionId, pfId } = args;
  const transactions = [];
  for await (const transaction of transactionsIterator({
    positionId,
    pfId,
  })) {
    transactions.push(transaction);
  }
  return transactions;
}

async function addNewSymbolToPortfolio(args: {
  pfId: string;
  symbol: string;
  crumb: string;
}) {
  const { pfId, symbol, crumb } = args;
  type Body = {
    parameters: {
      userId: string;
      userIdType: string;
      pfId: string;
      fullResponse: boolean;
    };
    operations: {
      operation: "position_insert";
      symbol: string;
    }[];
  };

  const body: Body = {
    parameters: {
      userId: "AI67JXWS64XUDKOUV7R5D3ADOQ",
      userIdType: "guid",
      pfId,
      fullResponse: true,
    },
    operations: [{ symbol, operation: "position_insert" }],
  };

  const url = new URL(
    "https://query1.finance.yahoo.com/v6/finance/portfolio/update"
  );
  const params = new URLSearchParams({
    crumb,
    action: "update",
    userId: "AI67JXWS64XUDKOUV7R5D3ADOQ",
    pfId,
  });

  url.search = params.toString();

  await fetch(url.toString(), {
    credentials: "include",
    headers: {
      ...commonHeaders,
      "Content-Type": "application/json",
    },
    referrer: `https://finance.yahoo.com/portfolio/${pfId}/view/v2`,
    body: JSON.stringify(body),
    method: "PUT",
    mode: "cors",
  });
}

function groupTransactionsByIdComment(transactions: YHTransaction[]) {
  const map = new Map<string, YHTransaction[]>();
  for (const transaction of transactions) {
    const { comment } = transaction;
    if (!comment) {
      continue;
    }
    const newArr = map.get(comment) ?? [];
    newArr.push(transaction);
    map.set(comment, newArr);
  }
  return map;
}

async function uploadData(
  activitiesToUpload: (WSTradingActivity | WSDepositActivity)[]
) {
  const tradingActivitiesToUpload = activitiesToUpload.filter(
    (x) => x.object === "order"
  ) as WSTradingActivity[];
  const depositActivitiesToUpload = activitiesToUpload.filter(
    (x) => x.object === "deposit"
  ) as WSDepositActivity[];

  const url = new URL(window.location.href);
  const parts = url.pathname.split("/");
  const pfId = parts[2];

  const crumb = await getCrumb({ pfId });
  let finance = await fetchFinance({ pfId });
  let positions = getPositions(finance);
  let posIdBySymbol = mapSymbolToPosId(positions);
  const tradingActivitiesGroupedBySymbol = groupBySymbol(
    tradingActivitiesToUpload
  );

  for (const symbol of tradingActivitiesGroupedBySymbol.keys()) {
    const positionId = posIdBySymbol.get(symbol);
    if (!positionId) {
      console.debug("Adding new symbol to porfolio", symbol);
      const suffix = NEO_EXCHANGE_TICKERS.includes(symbol) ? "NE" : "TO";
      await addNewSymbolToPortfolio({
        pfId,
        symbol: `${symbol}.${suffix}`,
        crumb,
      });
    }
  }

  // Reload finance after adding new symbols
  finance = await fetchFinance({ pfId });
  positions = getPositions(finance);
  posIdBySymbol = mapSymbolToPosId(positions);

  const errors = [];

  const existingCashTransactions =
    finance.finance.result[0].portfolios[0].cashTransactions.transactions;

  // Delete cash transactions that don't have a comment
  for (const dep of existingCashTransactions) {
    if (!dep.comment) {
      await deleteTransaction({
        id: dep.id,
        positionId: "",
        pfId,
        type: dep.type,
        crumb,
      });
    }
  }

  // Upload new cash transactions
  let depositProgress = 0;
  const existingCashTransactionComments = new Set(
    existingCashTransactions.filter((x) => x.comment).map((x) => x.comment)
  );
  for (const wsActivity of depositActivitiesToUpload) {
    depositProgress += 1;
    console.debug(
      `${depositProgress}/${depositActivitiesToUpload.length}`,
      wsActivity.id,
      wsActivity.value.amount,
      wsActivity.value.currency
    );
    if (existingCashTransactionComments.has(wsActivity.id)) {
      continue;
    }
    await uploadDeposit({
      pfId,
      wsActivity,
      crumb,
    });
  }

  let tickerProgress = 0;
  for (const [ticker, trades] of tradingActivitiesGroupedBySymbol) {
    tickerProgress += 1;
    console.debug(
      `${tickerProgress}/${tradingActivitiesGroupedBySymbol.size}`,
      ticker
    );

    const positionId = posIdBySymbol.get(ticker);
    if (!positionId) {
      errors.push(`Position ID not found for ${ticker}`);
      continue;
    }

    const existingTransactions = await fetchAllTransactions({
      pfId,
      positionId,
    });

    for (const tr of existingTransactions) {
      if (!tr.comment) {
        await deleteTransaction({
          id: tr.id,
          pfId,
          positionId,
          type: tr.type,
          crumb,
        });
      }
    }

    const existingTransactionsByIdComment =
      groupTransactionsByIdComment(existingTransactions);

    const tradesToUpload = trades
      .filter(
        (trade) =>
          !existingTransactionsByIdComment.has(trade.id) && trade.filled_at
      )
      .sort(
        (a, b) =>
          new Date(a.filled_at!).getTime() - new Date(b.filled_at!).getTime()
      );

    console.debug({ trades });
    console.debug({ tradesToUpload });

    // const depositActivities = depositActivitiesToUpload.filter(

    let tradesProgress = 0;
    for (const wsTrade of tradesToUpload) {
      tradesProgress += 1;
      console.debug(
        `${tradesProgress}/${tradesToUpload.length}`,
        wsTrade.id,
        wsTrade.order_type,
        wsTrade.quantity
      );
      await uploadTransaction({
        positionId,
        pfId,
        wsTrade,
        crumb,
      });
    }
  }

  console.debug("Done uploading.");

  if (errors.length > 0) {
    throw new Error(["\n**********", ...errors].join("\n"));
  }
}

function getData(): WSActivity[] {
  return tiChecker.WSActivity.fromArray(
    (window as unknown as { tickerToUpload: unknown }).tickerToUpload
  );
}

uploadData(getData()).catch(console.error);
