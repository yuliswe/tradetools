export async function* safelySettlePromisesInBatchesByIterator<
  Arg,
  PromiseValue,
>(
  args: Iterator<Arg>,
  handler: (args: Arg, index: number) => Promise<PromiseValue>,
  options?: { batchSize: number }
) {
  const { batchSize = 10 } = options ?? {};
  let nextBatch = takeNextN(batchSize, args);
  while (nextBatch.length > 0) {
    const results = await Promise.allSettled(nextBatch.map(handler));
    yield* results;
    nextBatch = takeNextN(batchSize, args);
  }
}

export async function* safelySettlePromisesInBatchesByAsyncIterator<
  Arg,
  PromiseValue,
>(
  args: AsyncIterator<Arg>,
  handler: (args: Arg, index: number) => Promise<PromiseValue>,
  options?: { batchSize: number }
) {
  const { batchSize = 10 } = options ?? {};
  let nextBatch = await asyncTakeNextN(batchSize, args);
  while (nextBatch.length > 0) {
    yield* await Promise.allSettled(nextBatch.map(handler));
    nextBatch = await asyncTakeNextN(batchSize, args);
  }
}

export async function safelySettlePromisesInBatches<Arg, PromiseValue>(
  args: Arg[],
  handler: (args: Arg, index: number) => Promise<PromiseValue>,
  options?: { batchSize: number }
): Promise<PromiseSettledResult<PromiseValue>[]> {
  return asyncGetAll(
    safelySettlePromisesInBatchesByIterator(
      args[Symbol.iterator](),
      handler,
      options
    )
  );
}

export async function* settlePromisesInBatchesByIterator<Arg, PromiseValue>(
  args: Iterator<Arg>,
  handler: (args: Arg, index: number) => Promise<PromiseValue>,
  options?: { batchSize: number }
) {
  const { batchSize = 10 } = options ?? {};
  let nextBatch = takeNextN(batchSize, args);
  while (nextBatch.length > 0) {
    const results = await Promise.all(nextBatch.map(handler));
    yield* results;
    nextBatch = takeNextN(batchSize, args);
  }
}

export async function settlePromisesInBatches<Arg, PromiseValue>(
  args: Arg[],
  handler: (args: Arg, index: number) => Promise<PromiseValue>,
  options?: { batchSize: number }
): Promise<PromiseValue[]> {
  return asyncGetAll(
    settlePromisesInBatchesByIterator(args[Symbol.iterator](), handler, options)
  );
}

export function takeNextN<T>(n: number, iterator: Iterator<T>): T[] {
  if (n <= 0) {
    return [];
  }
  const results: T[] = [];
  let next = iterator.next();
  while (!next.done && n > 0) {
    results.push(next.value);
    n--;
    if (n > 0) {
      next = iterator.next();
    }
  }
  return results;
}

export async function asyncTakeNextN<T>(
  n: number,
  iterator: AsyncIterator<T>
): Promise<T[]> {
  if (n <= 0) {
    return [];
  }
  const results: T[] = [];
  let next = await iterator.next();
  while (!next.done && n > 0) {
    results.push(next.value);
    n--;
    if (n > 0) {
      next = await iterator.next();
    }
  }
  return results;
}

export async function asyncGetAll<T>(iterator: AsyncIterator<T>): Promise<T[]> {
  const results: T[] = [];
  let next = await iterator.next();
  while (!next.done) {
    results.push(next.value);
    next = await iterator.next();
  }
  return results;
}

export function group<T>(array: T[], n: number): T[][] {
  const groups = [];
  for (let i = 0; i < array.length; i += n) {
    groups.push(array.slice(i, i + n));
  }
  return groups;
}
