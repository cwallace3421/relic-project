import { distance } from "./vector";

export const circle = (x1: number, y1: number, r1: number, x2: number, y2: number, r2: number): boolean => {
  const dist = distance(x1, y1, x2, y2);
  return dist < (r1 + r2);
};