import { Sprite, Texture } from "pixi.js";

export class Button extends Sprite {
  protected disabled: boolean = false;

  constructor(texture: Texture) {
    super(texture);
    this.eventMode = "static";
    this.cursor = "pointer";
  }

  public setDisabled(disabled: boolean) {
    this.disabled = disabled;
    this.eventMode = this.disabled ? "none" : "static";
    this.alpha = this.disabled ? 0.5 : 1;
  }

  public enable() {
    this.setDisabled(false);
  }

  public disable() {
    this.setDisabled(true);
  }
}
