import { createAccountCommand } from "src/cli/account";
import { createBuyCommand } from "src/cli/buy";
import { createLoginCommand } from "src/cli/login";
import { createSellCommand } from "src/cli/sell";
import { createTradesCommand } from "src/cli/trades";
import { createCommand } from "src/cli/utils";

export const createWealthsimpleProgram = () => {
  const program = createCommand({
    name: "ws-cli",
    summary: "Wealthsimple CLI",
    description: "Wealthsimple CLI",
  });
  return program
    .addCommand(createTradesCommand(program))
    .addCommand(createAccountCommand(program))
    .addCommand(createLoginCommand(program))
    .addCommand(createBuyCommand(program))
    .addCommand(createSellCommand(program));
};
