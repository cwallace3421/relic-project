import { Victor } from './Victor';

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

}