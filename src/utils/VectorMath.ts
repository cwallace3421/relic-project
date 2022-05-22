import { Victor } from './Victor';

const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end
const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);
const repeat = (t: number, m: number) => clamp(t - Math.floor(t / m) * m, 0, m);

export class VectorMath {

  static direction(from: Victor, to: Victor): Victor {
    return new Victor(to.x - from.x, to.y - from.y);
  }

  static min(mutable: Victor, limit: number): Victor {
    mutable.x = Math.min(mutable.x, limit);
    mutable.y = Math.min(mutable.y, limit);
    return mutable;
  }

  static max(mutable: Victor, limit: number): Victor {
    mutable.x = Math.max(mutable.x, limit);
    mutable.y = Math.max(mutable.y, limit);
    return mutable;
  }

  // static rotationLerp(fromAngle: number, toAngle: number, t: number) {
  //   const cs = (1 - t) * Math.cos(fromAngle) + t * Math.cos(toAngle);
  //   const sn = (1 - t) * Math.sin(fromAngle) + t * Math.sin(toAngle);
  //   return Math.atan2(sn, cs);
  // }

  // static angleLerp(fromAngle: number, toAngle: number, t: number) {
  //   const max = Math.PI * 2;
  //   const da = (toAngle - fromAngle) % max;
  //   const da2 = 2 * da % max - da;
  //   return fromAngle + da2 * t;
  // }

  static lerpTheta(fromAngle: number, toAngle: number, t: number): number {
    const dt = repeat(toAngle - fromAngle, 360);
    return lerp(fromAngle, fromAngle + (dt > 180 ? dt - 360 : dt), t);
  }

}