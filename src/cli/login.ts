import { Command } from "commander";
import { createCommand } from "src/cli/utils";
import { WealthsimpleAPI } from "src/wealthsimple/WeathsimpleAPI";

export const createLoginCommand = (program: Command) =>
  createCommand({
    name: "login",
    summary: "Login to Wealthsimple",
    description: "Login and store access token at ~/.wealthsimple/auth.json",
  }).action(() => loginCommand());

async function loginCommand() {
  const wealthsimple = new WealthsimpleAPI();
  await wealthsimple.reauthenticate();
}
