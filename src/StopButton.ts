import { Button } from "./Button";
import { AssetLoader } from "./AssetLoader";

export class StopButton extends Button {
  constructor() {
    super(AssetLoader.getInstance().getTexture("stopButton"));
  }
}
