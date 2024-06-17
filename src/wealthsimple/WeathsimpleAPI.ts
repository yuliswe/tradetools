import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { authenticator } from "otplib";
import {
  getSdk,
  type ActivityFeedItem,
  type FetchActivityListQueryVariables,
  type SecurityMarketDataFragment,
} from "src/__generated__/sdk";
import { tiChecker } from "src/tiChecker";
import {
  WSActivity,
  WSOrderSubType,
  WSOrderType,
  WSTimeInForce,
  type WSPostOrdersRequestFractionalBuyBody,
} from "src/types/wealthsimple";
import {
  authenticate,
  readAuthFile,
  writeAuthFile,
} from "src/wealthsimple/auth";
import * as uuid from "uuid";

dotenv.config();

export type AccountFinancials = {
  id: string;
  /** Total deposits throughout the history of the account. */
  netDeposits: number;
  /** Total balance of the account. */
  netLiquidationValue: number;
};

export class WealthsimpleAPI {
  bearerToken?: string;
  identityId = "identity-9ArKqNCmhnxU1sbZGd91BwDt8Wt";

  setAuth(args: { bearerToken: string }) {
    this.bearerToken = args.bearerToken;
  }

  getSdk() {
    if (!this.bearerToken) {
      throw new Error("bearerToken not set");
    }
    return getSdk(
      new GraphQLClient("https://my.wealthsimple.com/graphql", {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          authorization: `Bearer ${this.bearerToken}`,
          "cache-control": "no-cache",
          "content-type": "application/json",
          pragma: "no-cache",
          "sec-ch-ua":
            '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-platform-os": "web",
          "x-ws-api-version": "12",
          "x-ws-locale": "en-CA",
          "x-ws-profile": "invest",
          Referer: "https://my.wealthsimple.com/app/product-switcher-breather",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
      })
    );
  }

  async authenticate(args?: { username?: string }) {
    try {
      const { accessToken } = await readAuthFile();
      this.setAuth({ bearerToken: accessToken });
    } catch (error) {
      await this.reauthenticate(args);
    }
  }

  async reauthenticate(args?: { username?: string }) {
    console.log("Logging in using username and password.");
    const password = process.env.PASSWORD;
    if (!password) {
      throw new Error("PASSWORD env var not set");
    }
    const username = args?.username ?? process.env.USERNAME;
    if (!username) {
      throw new Error("username not set");
    }
    const optSecret = process.env.OTP_SECRET;
    if (!optSecret) {
      throw new Error("optSecret not set");
    }
    const oneTimePassword = authenticator.generate(optSecret);
    let accessToken;
    try {
      const { access_token } = await authenticate({
        username,
        password,
        oneTimePassword,
      });
      accessToken = access_token;
    } catch (error) {
      console.error("Error authenticating", error);
      console.error("Try again with CODE env var set to 2FA code.");
      process.exit(1);
    }
    await writeAuthFile({
      username,
      accessToken,
    });
    if (!accessToken) {
      throw new Error("Unable to retrieve access token.");
    }
    this.setAuth({ bearerToken: accessToken });
  }

  async sendRESTRequest(args: {
    path: string;
    params?: URLSearchParams;
    method: "POST" | "GET";
    body?: object;
  }) {
    const { path, params, method, body } = args;
    const url = new URL(`https://trade-service.wealthsimple.com${path}`);
    if (params) {
      url.search = params.toString();
    }
    return fetch(url.href, {
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.9",
        authorization: `Bearer ${this.bearerToken}`,
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        "sec-ch-ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-app-instance-id": "f4fe0f5c-24c7-4e79-8347-58c968ec5a54",
        "x-platform-os": "web",
        "x-ws-locale": "en-CA",
        "x-ws-profile": "trade",
      },
      referrer: "https://my.wealthsimple.com/",
      referrerPolicy: "strict-origin-when-cross-origin",
      method,
      mode: "cors",
      credentials: "include",
      ...(body && { body: JSON.stringify(body, null, 2) }),
    } as RequestInit);
  }

  async searchSecurities(args: { query: string }) {
    const resp = await this.sendRESTRequest({
      path: "/securities",
      params: new URLSearchParams([["query", args.query]]),
      method: "GET",
    });
    return tiChecker.WSSearchSecuritiesResponse.from(await resp.json()).results;
  }

  async fetchSecurityBySymbol(args: { symbol: string }) {
    const { symbol } = args;
    const resp = await this.sendRESTRequest({
      path: "/securities",
      params: new URLSearchParams([["query", symbol]]),
      method: "GET",
    });
    const { results } = tiChecker.WSSearchSecuritiesResponse.from(
      await resp.json()
    );
    for (const sec of results) {
      if (sec.stock.symbol === symbol) {
        return sec;
      }
    }
    return null;
  }

  async fetchPositions() {
    const resp = await this.sendRESTRequest({
      path: "/account/positions",
      method: "GET",
    });
    return tiChecker.WSFetchPositionsResponse.from(await resp.json()).results;
  }

  async fetchSecuritiesMarketData(args: {
    securityIds: string[];
  }): Promise<Map<string, SecurityMarketDataFragment>> {
    const { securityIds } = args;
    const resp = await Promise.all(
      securityIds.map(async (id) => {
        const result = await this.getSdk().FetchSecurityMarketData({
          id,
        });
        return result.security;
      })
    );
    const quotes = new Map<string, SecurityMarketDataFragment>();
    for (const sec of resp) {
      quotes.set(sec.stock.symbol, sec);
    }
    return quotes;
  }

  async fetchAllAccountFinancials(): Promise<AccountFinancials[]> {
    const resp = await this.getSdk().FetchAllAccountFinancials({
      identityId: this.identityId,
    });
    const accounts = [];
    for (const edge of resp.identity.accounts.edges) {
      const { id, type, custodianAccounts } = edge.node;
      for (const acc of custodianAccounts) {
        const {
          financials: {
            current: { netDeposits, netLiquidationValue },
          },
        } = acc;
        if (Number(netLiquidationValue.amount) > 0) {
          accounts.push({
            id,
            netDeposits: Number(netDeposits.amount),
            netLiquidationValue: Number(netLiquidationValue.amount),
            type,
          });
        }
      }
    }
    return accounts;
  }

  async trade(args: {
    accountId: string;
    securityId: string;
    orderType: WSOrderType.BUY_QUANTITY | WSOrderType.SELL_QUANTITY;
    quantity: number;
    limitPrice: number;
  }) {
    const { accountId, securityId, quantity, limitPrice, orderType } = args;
    const resp = await this.sendRESTRequest({
      path: "/orders",
      method: "POST",
      body: {
        account_id: accountId,
        security_id: securityId,
        order_type: orderType,
        order_sub_type: WSOrderSubType.LIMIT,
        time_in_force: WSTimeInForce.DAY,
        idempotency_key: uuid.v4(),
        market_value: limitPrice,
        quantity,
        limit_price: limitPrice,
      },
    });
    if (resp.status !== 201) {
      console.log(resp);
      throw new Error(`Failed to place trade: ${await resp.text()}`);
    }
    return resp;
  }

  async tradeFractional(args: {
    accountId: string;
    securityId: string;
    buyAmount: number;
    expectedQuantity: number;
  }) {
    const body: WSPostOrdersRequestFractionalBuyBody = {
      account_id: args.accountId,
      security_id: args.securityId,
      order_type: WSOrderType.BUY_VALUE,
      order_sub_type: WSOrderSubType.FRACTIONAL,
      time_in_force: WSTimeInForce.DAY,
      idempotency_key: uuid.v4(),
      market_value: args.buyAmount,
      quantity: args.expectedQuantity,
    };
    const resp = await this.sendRESTRequest({
      path: "/orders",
      method: "POST",
      body,
    });
    if (resp.status !== 201) {
      console.log(resp);
      throw new Error(`Failed to place trade: ${await resp.text()}`);
    }
    return resp;
  }

  async *fetchActivities(query?: Partial<FetchActivityListQueryVariables>) {
    const results: ActivityFeedItem[] = [];
    let cursor: string | undefined = undefined;
    let hasNext = true;
    while (hasNext) {
      const resp = await this.getSdk().FetchActivityList({
        first: 50,
        ...query,
        cursor,
      });
      results.push(...resp.activities.edges.map((edge) => edge.node));
      cursor = resp.activities.pageInfo.endCursor;
      hasNext = resp.activities.pageInfo.hasNextPage;
      yield* results;
    }
  }

  async *listTrades() {
    let bookmark: string | undefined = undefined;
    let results: WSActivity[] = [];
    do {
      const resp = await this.sendRESTRequest({
        path: "/account/activities",
        params: new URLSearchParams([
          ["account_ids", ""],
          ["limit", "10"],
          ["bookmark", bookmark ?? ""],
          ["type", "buy"],
          ["type", "sell"],
          ["status", "submitted"],
        ]),
        method: "GET",
      });
      ({ bookmark, results } = tiChecker.WSFetchActivitiesResponse.from(
        await resp.json()
      ));
      yield* tiChecker.WSTradingActivity.fromArray(results);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (results.length > 0);
  }
}
