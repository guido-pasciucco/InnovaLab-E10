// Reads a whole ReadableStream into an array. The DOM typings do not make a
// ReadableStream async iterable, so tests read it through its reader.
export async function readStream<T>(stream: ReadableStream<T>): Promise<T[]> {
  const reader = stream.getReader();
  const items: T[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return items;
    items.push(value);
  }
}
