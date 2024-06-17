export type YHTransaction = {
  id: string;
  positionId: string;
  symbol: string;
  type: "BUY" | "SELL";
  date: string;
  quantity: number;
  pricePerShare: number;
  totalValue: number;
  totalRealizedGain: number;
  totalRealizedPercentGain: number;
  quantityContributingToLot: number;
  comment?: string;
};

export type YHLot = {
  lotId: string;
  sortOrder: number;
  tradeDate: string;
  purchasePrice: number;
  quantity: number;
  commission: number;
  totalGain: number;
  totalPercentGain: number;
  dailyGain: number;
  dailyPercentGain: number;
  currentMarketValue: number;
  purchasedMarketValue: number;
};

export type YHPosition = {
  posId: string;
  symbol: string;
  sortOrder: number;
  lots: YHLot[];
  totalLotCount: number;
  totalTransactionsCount: number;
  holdingsState: string;
  totalRealizedGain?: number;
  totalRealizedPercentGain?: number | null;
  valueWeight?: number;
  totalDividendIncome?: number;
  totalDividendTransactionsCount: number;
};

export type YHCashTransaction = {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  date: string;
  quantity: number;
  comment?: string;
  currency?: "CAD" | "USD";
};

export type YHPortfolio = {
  pfId: string;
  pfName: string;
  userId: string;
  cashPosition: number;
  positions: YHPosition[];
  cashTransactions: { transactions: YHCashTransaction[] };
};

export type YHFinance = {
  result: {
    userId: string;
    portfolios: YHPortfolio[];
  }[];
};

export type YHFetchTransactionsAPIResponse = {
  transactions: YHTransaction[];
  totalCount: number;
};

export type YHFetchFinanceAPIResponse = {
  finance: YHFinance;
};
