import { Sprite, Texture } from "pixi.js";

export class ReelSymbol extends Sprite {
  constructor(texture: Texture, width: number, height: number) {
    super(texture);
    this.width = width;
    this.height = height;
  }
}
