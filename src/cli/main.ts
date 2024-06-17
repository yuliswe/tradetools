import chalk from "chalk";
import { createWealthsimpleProgram } from "src/cli/program";

chalk.level = 3;

export const program = createWealthsimpleProgram();
program.parse();
