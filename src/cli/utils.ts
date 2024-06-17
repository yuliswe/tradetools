import { Command } from "commander";
import { print } from "src/cli/console";

export const createCommand = (props: {
  name: string;
  summary: string;
  description: string;
}) => {
  const { name, summary, description } = props;
  return new Command(name)
    .addHelpCommand(false)
    .summary(summary)
    .description(description)
    .configureOutput({
      writeErr: print,
      writeOut: print,
    })
    .helpOption("--help", "Display help for command");
};
