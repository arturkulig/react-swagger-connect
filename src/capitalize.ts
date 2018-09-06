export function capitalize(line: string) {
  return line
    .trim()
    .split('')
    .map((letter, i) => (i === 0 ? letter.toUpperCase() : letter))
    .join('');
}
