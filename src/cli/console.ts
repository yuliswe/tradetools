export const print = (message: string) => {
  process.stdout.write(message);
};

export const println = (message: string) => {
  print(message + "\n");
};
