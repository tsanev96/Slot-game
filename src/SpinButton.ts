import { Button } from "./Button";
import { AssetLoader } from "./AssetLoader";

export enum SpinButtonEvents {
  startSpinning = "startSpinning",
  stopSpinning = "stopSpinning",
}

export class SpinButton extends Button {
  constructor() {
    super(AssetLoader.getInstance().getTexture("spinButton"));
  }
}
