export const length = (x: number, y: number): number => Math.sqrt((x * x) + (y * y));

export const normalize = (x: number, y: number): { x: number, y: number } => {
  if (x === 0 && y === 0) return { x, y };

  const len = length(x, y);
  return { x: x / len, y: y / len };
}

export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dirX = x1 - x2;
  const dirY = y1 - y2;
  return Math.sqrt((dirX * dirX) + (dirY * dirY));
}

const l = (a: number, b: number, t: number) => a + ((b - a) * t);

export const lerp = (x1: number, y1: number, x2: number, y2: number, t: number, clamp?: number): { x: number, y: number } => {
  const xDiff = Math.abs(x2 - x1);
  const yDiff = Math.abs(y2 - y1);

  if (xDiff > 15 || yDiff > 15) {
    // This threshold was randomly chosen, just to make sure that the difference isn't growing. And the the lerp is keeping up mostly.
    console.error('Lerping is not catching up', { xDiff, yDiff });
  }

  if (clamp) {
    return {
      x: xDiff < clamp ? x2 : l(x1, x2, t),
      y: yDiff < clamp ? y2 : l(y1, y2, t),
    }
  } else {
    return {
      x: l(x1, x2, t),
      y: l(y1, y2, t),
    }
  }
};

export const lerpNumber = (n1: number, n2: number, t: number, clamp?: number): number => {
  const diff = Math.abs(n2 - n1);
  if (clamp) {
    return diff < clamp ? n2 : l(n1, n2, t)
  } else {
    return l(n1, n2, t)
  }
};