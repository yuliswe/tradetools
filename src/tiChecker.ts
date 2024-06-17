import { AuthFileContent } from "src/__generated__/auth-ti";
import cliOptionsCheckers from "src/__generated__/cliOptions-ti";
import wsCheckers from "src/__generated__/wealthsimple-ti";
import yhCheckers from "src/__generated__/yahoo-ti";
import type * as auth from "src/types/auth";
import type * as cliOptions from "src/types/cliOptions";
import type * as ws from "src/types/wealthsimple";
import type * as yahoo from "src/types/yahoo";
import { Checker, IErrorDetail, createCheckers } from "ts-interface-checker";

/**
 * How to add a new type to the tiChecker:
 *
 * 1. Create a new type in the types directory, for example `src/types/myType.ts`.
 * 2. Generates new ti file in the __generated__ directory, for example `src/__generated__/myType-ti.ts`.
 * 3. Add `import type * as myType from "src/types/myType";`
 * 4. Add `import myTypeCheckers from "src/__generated__/myType-ti";`
 * 5. Add `...myTypeCheckers` to the `checkers` object.
 * 6. Add `MyType: TypedChecker<myType.MyType>` to the `TypedCheckers` type.
 */

const checkers = {
  ...wsCheckers,
  ...yhCheckers,
  ...cliOptionsCheckers,
  AuthFileContent,
};

type TypedChecker<T> = Checker & {
  from: (v: unknown) => T;
  fromArray: (v: unknown) => T[];
  strictFrom: (v: unknown) => T;
  strictFromArray: (v: unknown) => T[];
};

type TypedCheckers = {
  YHFetchFinanceAPIResponse: TypedChecker<yahoo.YHFetchFinanceAPIResponse>;
  YHFinance: TypedChecker<yahoo.YHFinance>;
  YHFetchTransactionsAPIResponse: TypedChecker<yahoo.YHFetchTransactionsAPIResponse>;
  YHPortfolio: TypedChecker<yahoo.YHPortfolio>;
  YHPosition: TypedChecker<yahoo.YHPosition>;
  YHTransaction: TypedChecker<yahoo.YHTransaction>;
  YHCashTransaction: TypedChecker<yahoo.YHCashTransaction>;
  YHLot: TypedChecker<yahoo.YHLot>;
  WealthsimpleGlobalWindow: TypedChecker<ws.WealthsimpleGlobalWindow>;
  WSFetchActivitiesResponse: TypedChecker<ws.WSFetchActivitiesResponse>;
  WSTradingActivity: TypedChecker<ws.WSTradingActivity>;
  WSDepositActivity: TypedChecker<ws.WSDepositActivity>;
  WSAuthenticationResponse: TypedChecker<ws.WSAuthenticationResponse>;
  WSMoney: TypedChecker<ws.WSMoney>;
  WSQuote: TypedChecker<ws.WSQuote>;
  WSPosition: TypedChecker<ws.WSPosition>;
  WSFetchPositionsResponse: TypedChecker<ws.WSFetchPositionsResponse>;
  WSStock: TypedChecker<ws.WSStock>;
  WSActivity: TypedChecker<ws.WSActivity>;
  WSOrderStatus: TypedChecker<ws.WSOrderStatus>;
  WSSearchSecuritiesResponse: TypedChecker<ws.WSSearchSecuritiesResponse>;
  AuthFileContent: TypedChecker<auth.AuthFileContent>;
  CliAccountCommandOptions: TypedChecker<cliOptions.CliAccountCommandOptions>;
  CliTradesCommandOptions: TypedChecker<cliOptions.CliTradesCommandOptions>;
  CliBuyCommandOptions: TypedChecker<cliOptions.CliBuyCommandOptions>;
  CliSellCommandOptions: TypedChecker<cliOptions.CliSellCommandOptions>;
};

function from<T>(
  value: unknown,
  checker: TypedChecker<T>,
  opts: { strict: boolean }
): T {
  const { strict } = opts;
  if (Array.isArray(value)) {
    throw new Error(`Expected non-array, got array: ${JSON.stringify(value)}`);
  }
  const errors = strict
    ? checker.strictValidate(value)
    : checker.validate(value);
  if (errors !== null) {
    let msg = "Validation failed:\n";
    const flatten = (errors: IErrorDetail[]): IErrorDetail[] =>
      errors.flatMap((e) => (e.nested ? flatten(e.nested) : e));
    for (const { path, message } of flatten(errors)) {
      msg += `  ${path} ${message}\n`;
    }
    msg += `\nValue: ${JSON.stringify(value, null, 2)}`;
    throw new Error(msg);
  }
  return value as T;
}

function fromArray<T>(
  value: unknown,
  checker: TypedChecker<T>,
  opts: { strict: boolean }
): T[] {
  const { strict } = opts;
  if (!Array.isArray(value)) {
    throw new Error(`Expected array, got: ${JSON.stringify(value, null, 2)}`);
  }
  const flatten = (errors: IErrorDetail[]): IErrorDetail[] =>
    errors.flatMap((e) => (e.nested ? flatten(e.nested) : e));
  for (const v of value) {
    const errors = strict ? checker.strictValidate(v) : checker.validate(v);
    if (errors !== null) {
      let msg = "Validation failed:\n";
      for (const { path, message } of flatten(errors)) {
        msg += `  ${path} ${message}\n`;
      }
      msg += `Value: ${JSON.stringify(value, null, 2)}\n`;
      throw new Error(msg);
    }
  }
  return value as T[];
}

export const tiChecker = Object.fromEntries(
  Object.entries(
    createCheckers(checkers) as Record<keyof typeof checkers, Checker>
  ).map(([k, checker]) => {
    checker.setReportedPath("");
    return [
      k,
      {
        ...checker,
        from: <T>(value: unknown): T =>
          from(value, checker as TypedChecker<T>, { strict: false }),
        fromArray: <T>(value: unknown): T[] =>
          fromArray(value, checker as TypedChecker<T>, { strict: false }),
        strictFrom: <T>(value: unknown): T =>
          from(value, checker as TypedChecker<T>, { strict: true }),
        strictFromArray: <T>(value: unknown): T[] =>
          fromArray(value, checker as TypedChecker<T>, { strict: true }),
      },
    ];
  })
) as TypedCheckers;
