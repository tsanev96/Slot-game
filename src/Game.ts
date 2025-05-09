import { Container } from "pixi.js";

import { GameConfig } from "./config";
import { ReelArea, ReelAreaEvents } from "./ReelArea";
import { SpinButton } from "./SpinButton";
import { StopButton } from "./StopButton";

export class Game extends Container {
  private spinButton: SpinButton;
  private stopButton: StopButton;

  constructor(config: GameConfig) {
    super();

    const reelArea = new ReelArea(config);
    this.addChild(reelArea);

    this.spinButton = new SpinButton();
    this.stopButton = new StopButton();

    [this.spinButton, this.stopButton].forEach((button) => {
      button.position.set(config.reelAreaWidth, config.reelAreaHeight / 2);
      button.anchor.set(0, 0.5);
      button.width = config.spinButtonSize;
      button.height = config.spinButtonSize;
      this.addChild(button);
    });

    this.stopButton.visible = false;

    this.spinButton.on("click", () => {
      reelArea.startSpinning();
      this.showStopButton();
      this.stopButton.disable();
    });

    this.stopButton.on("click", () => {
      reelArea.stopSpinning();
      this.showSpinButton();
      this.spinButton.disable();
    });

    reelArea.on(ReelAreaEvents.allStoppedSpinning, () => {
      this.showSpinButton();
      this.spinButton.enable();
    });

    reelArea.on(ReelAreaEvents.allStartedSpinning, () => {
      this.stopButton.enable();
    });
  }

  private showSpinButton() {
    this.spinButton.visible = true;
    this.stopButton.visible = false;
  }

  private showStopButton() {
    this.spinButton.visible = false;
    this.stopButton.visible = true;
  }
}
