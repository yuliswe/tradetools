/**
 * Request for POST /orders
 */
const exampleOrderRequest = {
  account_id: "non-registered-c9SlDnPRDw",
  security_id: "sec-s-72aca418e7724cea8ade97b988bbce39",
  order_type: "buy_value",
  order_sub_type: "fractional",
  time_in_force: "day",
  idempotency_key: "e50c3af1-c320-44aa-bdff-799780764f5a",
  market_value: 16,
  quantity: 0.3189,
};

/**
 * Response for POST /orders
 */
const exampleOrderResponse = {
  object: "order",
  id: "order-e50c3af1-c320-44aa-bdff-799780764f5a",
  account_hold_value: {
    amount: 16,
    currency: "CAD",
  },
  account_id: "non-registered-c9SlDnPRDw",
  account_value: null,
  completed_at: null,
  fill_fx_rate: null,
  filled_at: null,
  market_value: {
    amount: 16,
    currency: "CAD",
  },
  order_id: "order-e50c3af1-c320-44aa-bdff-799780764f5a",
  order_sub_type: "fractional",
  order_type: "buy_value",
  open_close: null,
  perceived_filled_at: null,
  cancelled_at: null,
  rejected_at: null,
  quantity: 0.31891568666533787,
  security_id: "sec-s-72aca418e7724cea8ade97b988bbce39",
  security_name: "CI First Asset High Interest Savings ETF",
  status: "new",
  stop_price: null,
  symbol: "CSAV",
  time_in_force: "day",
  limit_price: {
    amount: 16,
    currency: "CAD",
  },
  external_order_id: "order-e50c3af1-c320-44aa-bdff-799780764f5a",
  external_security_id: "sec-s-72aca418e7724cea8ade97b988bbce39",
  account_currency: "CAD",
  market_currency: "CAD",
  cancellation_cutoff: null,
};
