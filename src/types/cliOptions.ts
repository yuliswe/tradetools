export type CliAccountCommandOptions = {
  rebalance?: boolean;
  yes?: boolean;
};

export type CliTradesCommandOptions = {};

export type CliBuyCommandOptions = {
  cad?: number;
  tsfa?: boolean;
  rrsp?: boolean;
  nonreg?: boolean;
  yes?: boolean;
  fractional?: boolean;
};

export type CliSellCommandOptions = {
  cad?: number;
  yes?: boolean;
};
