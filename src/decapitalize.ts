export function decapitalize(line: string) {
  return line
    .trim()
    .split('')
    .map((letter, i) => (i === 0 ? letter.toLowerCase() : letter))
    .join('');
}
