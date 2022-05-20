export const randomNumberInRange = (start: number, end: number): number => {
  return start + Math.random() * ((end - start) + 1);
}