export function flatten<T>(subject: Array<T | T[]>): T[] {
  return subject.reduce<T[]>(
    (result: T[], item: T | T[]) => result.concat(item),
    [] as T[]
  );
}
