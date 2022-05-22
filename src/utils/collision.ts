import { Victor } from "./Victor";

export class Collision {
  static circle(aPos: Victor, aRadius: number, bPos: Victor, bRadius: number): boolean {
    const distance = aPos.distance(bPos);
    return distance < (aRadius + bRadius);;
  }
}