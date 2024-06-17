export type WSMoney = {
  amount: string | number;
  currency: "CAD" | "USD";
};

export type WSTradingActivity = {
  object: "order";
  id: string;
  account_id: string;
  account_value: WSMoney | null;
  completed_at: string | null;
  fill_quantity: number | null;
  filled_at: string | null;
  order_id: string;
  order_sub_type: WSOrderSubType;
  order_type: WSOrderType;
  perceived_filled_at: string | null;
  quantity: number;
  security_id: string;
  security_name: string;
  status: WSOrderStatus;
  stop_price: WSMoney | null;
  symbol: string;
  time_in_force: string;
  updated_at: string;
  limit_price?: WSMoney;
  account_currency: string;
  market_currency: string;
  cashback_order?: null | string;
  filled_net_value: string | null;
  created_at: string;
};

export type WSDepositActivity = {
  id: string;
  object: "deposit";
  value: WSMoney;
  accepted_at: string;
};

export type WSActivity = WSTradingActivity | WSDepositActivity;

export type WealthsimpleGlobalWindow = {
  wealthsimple: {
    auth: {
      access_token: string;
    };
  };
};

export type WSFetchActivitiesResponse = {
  bookmark: string;
  results: WSActivity[];
};

export type WSPosition = {
  object: "position";
  /** Same as the security ID */
  id: string;
  currency: "CAD" | "USD";
  quantity: number;
  book_value: WSMoney;
  /** Appears to be the same as book_value */
  market_book_value: WSMoney;
  /**
   * @deprecated Use securityMarketData API instead. This quote appears to be
   * lagging behind.
   */
  quote: WSQuote;
  account_id: string;
  stock: WSStock;
};

/**
 * @deprecated Use securityMarketData API instead. This quote appears to be
 * lagging behind.
 */
export type WSQuote = {
  object: "spot_quote";
  security_id: string;
  amount: string;
  currency: "CAD";
  ask: string;
  ask_size: number;
  bid: string;
  bid_size: number;
  high: string;
  last_size: number;
  low: string;
  open: string;
  volume: number;
  previous_close: string;
  previous_closed_at: string;
  quote_date: string;
  quoted_as_of: string;
  last: string;
};

export type WSAuthenticationResponse = {
  access_token: string;
};

export type WSFetchPositionsResponse = {
  results: WSPosition[];
};

export type WSStock = {
  symbol: string;
  name: string;
  primary_exchange: string;
};

export enum WSOrderStatus {
  POSTED = "posted",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
  REJECTED = "rejected",
  SUBMITTED = "submitted",
  FILLED = "filled",
}

export type WSSearchSecuritiesResponse = {
  offset: number;
  total_count: number;
  results: WSSecurity[];
};

type WSSecurity = {
  object: "security";
  id: string;
  stock: WSStock;
};

type WSPostOrdersRequestBodyBase = {
  account_id: string;
  security_id: string;
  order_type: WSOrderType;
  order_sub_type: WSOrderSubType;
  time_in_force: WSTimeInForce;
  idempotency_key: string;
};

export type WSPostOrdersRequestFractionalBuyBody = {
  market_value?: number;
  quantity?: number;
} & WSPostOrdersRequestBodyBase;

export enum WSOrderType {
  BUY_QUANTITY = "buy_quantity",
  BUY_VALUE = "buy_value",
  SELL_QUANTITY = "sell_quantity",
}

export enum WSOrderSubType {
  LIMIT = "limit",
  FRACTIONAL = "fractional",
  MARKET = "market",
  STOP_LIMIT = "stop_limit",
}

export enum WSTimeInForce {
  DAY = "day",
  UNTIL_CANCEL = "until_cancel",
}
