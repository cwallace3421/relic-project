const degrees = 180 / Math.PI;

export class Victor {

  private static zero = new Victor(0, 0);

  public x = 0;

  public y = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  addX(vec: Victor): Victor {
    this.x += vec.x;
    return this;
  };

  addY(vec: Victor): Victor {
    this.y += vec.y;
    return this;
  };

  add(vec: Victor): Victor {
    this.x += vec.x;
    this.y += vec.y;
    return this;
  };

  addScalar(scalar: number): Victor {
    this.x += scalar;
    this.y += scalar;
    return this;
  };

  addScalarX(scalar: number): Victor {
    this.x += scalar;
    return this;
  };

  addScalarY(scalar: number): Victor {
    this.y += scalar;
    return this;
  };

  subtractX(vec: Victor): Victor {
    this.x -= vec.x;
    return this;
  };

  subtractY(vec: Victor): Victor {
    this.y -= vec.y;
    return this;
  };

  subtract(vec: Victor): Victor {
    this.x -= vec.x;
    this.y -= vec.y;
    return this;
  };

  subtractScalar(scalar: number): Victor {
    this.x -= scalar;
    this.y -= scalar;
    return this;
  };

  subtractScalarX(scalar: number): Victor {
    this.x -= scalar;
    return this;
  };

  subtractScalarY(scalar: number): Victor {
    this.y -= scalar;
    return this;
  };

  divideX(vector: Victor): Victor {
    this.x /= vector.x;
    return this;
  };

  divideY(vector: Victor): Victor {
    this.y /= vector.y;
    return this;
  };

  divide(vector: Victor): Victor {
    this.x /= vector.x;
    this.y /= vector.y;
    return this;
  };

  divideScalar(scalar: number): Victor {
    if (scalar !== 0) {
      this.x /= scalar;
      this.y /= scalar;
    } else {
      this.x = 0;
      this.y = 0;
    }
    return this;
  };

  divideScalarX(scalar: number): Victor {
    if (scalar !== 0) {
      this.x /= scalar;
    } else {
      this.x = 0;
    }
    return this;
  };

  divideScalarY(scalar: number): Victor {
    if (scalar !== 0) {
      this.y /= scalar;
    } else {
      this.y = 0;
    }
    return this;
  };

  invertX(): Victor {
    this.x *= -1;
    return this;
  };

  invertY(): Victor {
    this.y *= -1;
    return this;
  };

  invert(): Victor {
    this.invertX();
    this.invertY();
    return this;
  };

  multiplyX(vector: Victor): Victor {
    this.x *= vector.x;
    return this;
  };

  multiplyY(vector: Victor): Victor {
    this.y *= vector.y;
    return this;
  };

  multiply(vector: Victor): Victor {
    this.x *= vector.x;
    this.y *= vector.y;
    return this;
  };

  multiplyScalar(scalar: number): Victor {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  };

  multiplyScalarX(scalar: number): Victor {
    this.x *= scalar;
    return this;
  };

  multiplyScalarY(scalar: number): Victor {
    this.y *= scalar;
    return this;
  };

  normalize(): Victor {
    const length = this.length();
    this.divideScalar(length);
    return this;
  };

  norm(): Victor {
    return this.normalize();
  };

  limit(max: number, factor: number): Victor {
    if (Math.abs(this.x) > max) { this.x *= factor; }
    if (Math.abs(this.y) > max) { this.y *= factor; }
    return this;
  };

  randomize(topLeft: Victor, bottomRight: Victor): Victor {
    this.randomizeX(topLeft, bottomRight);
    this.randomizeY(topLeft, bottomRight);
    return this;
  };

  randomizeX(topLeft: Victor, bottomRight: Victor): Victor {
    const min = Math.min(topLeft.x, bottomRight.x);
    const max = Math.max(topLeft.x, bottomRight.x);
    this.x = Victor.random(min, max);
    return this;
  };

  randomizeY(topLeft: Victor, bottomRight: Victor): Victor {
    const min = Math.min(topLeft.y, bottomRight.y);
    const max = Math.max(topLeft.y, bottomRight.y);
    this.y = Victor.random(min, max);
    return this;
  };

  randomizeAny(topLeft: Victor, bottomRight: Victor): Victor {
    if (!!Math.round(Math.random())) {
      this.randomizeX(topLeft, bottomRight);
    } else {
      this.randomizeY(topLeft, bottomRight);
    }
    return this;
  };

  unfloat(): Victor {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
  };

  mixX(vec: Victor, amount?: number): Victor {
    if (typeof amount === 'undefined') {
      amount = 0.5;
    }

    this.x = (1 - amount) * this.x + amount * vec.x;
    return this;
  };

  mixY(vec: Victor, amount?: number): Victor {
    if (typeof amount === 'undefined') {
      amount = 0.5;
    }

    this.y = (1 - amount) * this.y + amount * vec.y;
    return this;
  };

  mix(vec: Victor, amount: number): Victor {
    this.mixX(vec, amount);
    this.mixY(vec, amount);
    return this;
  };

  clone(): Victor {
    return new Victor(this.x, this.y);
  };

  copyX(vec: Victor): Victor {
    this.x = vec.x;
    return this;
  };

  copyY(vec: Victor): Victor {
    this.y = vec.y;
    return this;
  };

  copy(vec: Victor): Victor {
    this.copyX(vec);
    this.copyY(vec);
    return this;
  };

  zero(): Victor {
    this.x = this.y = 0;
    return this;
  };

  dot(vec: Victor): number {
    return this.x * vec.x + this.y * vec.y;
  };

  cross(vec: Victor): number {
    return (this.x * vec.y) - (this.y * vec.x);
  };

  projectOnTo(vec: Victor): Victor {
    const coeff = ((this.x * vec.x) + (this.y * vec.y)) / ((vec.x * vec.x) + (vec.y * vec.y));
    this.x = coeff * vec.x;
    this.y = coeff * vec.y;
    return this;
  };

  horizontalAngle(): number {
    return Math.atan2(this.y, this.x);
  };

  horizontalAngleDeg(): number {
    return Victor.radian2degrees(this.horizontalAngle());
  };

  verticalAngle(): number {
    return Math.atan2(this.x, this.y);
  };

  verticalAngleDeg(): number {
    return Victor.radian2degrees(this.verticalAngle());
  };

  angle(): number {
    return this.horizontalAngle();
  }

  angleDeg(): number {
    return this.horizontalAngleDeg();
  }

  direction(): number {
    return this.horizontalAngle();
  }

  rotate(angle: number): Victor {
    const nx = (this.x * Math.cos(angle)) - (this.y * Math.sin(angle));
    const ny = (this.x * Math.sin(angle)) + (this.y * Math.cos(angle));

    this.x = nx;
    this.y = ny;

    return this;
  };

  rotateDeg(angle: number): Victor {
    angle = Victor.degrees2radian(angle);
    return this.rotate(angle);
  };

  rotateTo(rotation: number): Victor {
    return this.rotate(rotation - this.angle());
  };

  rotateToDeg(rotation: number): Victor {
    rotation = Victor.degrees2radian(rotation);
    return this.rotateTo(rotation);
  };

  rotateBy(rotation: number): Victor {
    const angle = this.angle() + rotation;
    return this.rotate(angle);
  };

  rotateByDeg(rotation: number): Victor {
    rotation = Victor.degrees2radian(rotation);
    return this.rotateBy(rotation);
  };

  distanceX(vec: Victor): number {
    return this.x - vec.x;
  };

  absDistanceX(vec: Victor): number {
    return Math.abs(this.distanceX(vec));
  };

  distanceY(vec: Victor): number {
    return this.y - vec.y;
  };

  absDistanceY(vec: Victor): number {
    return Math.abs(this.distanceY(vec));
  };

  distance(vec: Victor): number {
    return Math.sqrt(this.distanceSq(vec));
  };

  distanceSq(vec: Victor): number {
    const dx = this.distanceX(vec);
    const dy = this.distanceY(vec);
    return dx * dx + dy * dy;
  };

  length(): number {
    return Math.sqrt(this.lengthSq());
  };

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  };

  magnitude(): number {
    return this.length();
  }

  isZero(): boolean {
    return this.x === 0 && this.y === 0;
  };

  isEqualTo(vec2: Victor): boolean {
    return this.x === vec2.x && this.y === vec2.y;
  };

  toString(): string {
    return 'x:' + this.x + ', y:' + this.y;
  };

  toArray(): number[] {
    return [this.x, this.y];
  };

  toObject(): { x: number, y: number } {
    return { x: this.x, y: this.y };
  };

  static random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  static radian2degrees(rad: number): number {
    return rad * degrees;
  }

  static degrees2radian(deg: number): number {
    return deg / degrees;
  }

  static getZero(): Victor {
    return this.zero.clone();
  }
};
