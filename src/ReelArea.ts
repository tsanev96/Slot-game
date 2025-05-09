import gsap from "gsap";
import { Container, Graphics } from "pixi.js";

import { GameConfig } from "./config";
import { Reel, ReelEvents } from "./Reel";

export enum ReelAreaEvents {
  allStartedSpinning = "allStartedSpinning",
  allStoppedSpinning = "allStoppedSpinning",
}

export class ReelArea extends Container {
  private reels: Reel[];
  private reelsFinishedSpinningCount = 0;
  private readonly stopDelay: number;
  private readonly stopInterval: number;
  private readonly startInterval: number;

  constructor(config: GameConfig) {
    super();

    this.stopDelay = config.stopDelay;
    this.stopInterval = config.stopInterval;
    this.startInterval = config.startInterval;

    this.mask = new Graphics()
      .beginFill(0xffffff)
      .drawRect(0, 0, config.reelAreaWidth, config.reelAreaHeight)
      .endFill();

    this.addChild(this.mask);

    // this.addChild(
    //   new Graphics()
    //     .lineStyle(10, 0xaa0000)
    //     .drawRect(
    //       -10,
    //       -10,
    //       config.reelAreaWidth + 20,
    //       config.reelAreaHeight + 20
    //     )
    // );

    const symbolWidth = config.reelAreaWidth / config.reelsCount;

    this.reels = Array.from(
      { length: config.reelsCount },
      () => new Reel(config)
    );

    for (const [i, reel] of this.reels.entries()) {
      reel.position.x = i * symbolWidth;
      this.addChild(reel);
    }

    for (const reel of this.reels) {
      reel.on(ReelEvents.stoppedSpinning, () => {
        this.reelsFinishedSpinningCount++;
        if (this.reelsFinishedSpinningCount === this.reels.length) {
          this.emit(ReelAreaEvents.allStoppedSpinning);
        }
      });
    }
  }

  public override on(
    event: ReelAreaEvents | Parameters<Container["on"]>[0],
    callback: () => void
  ) {
    return super.on(event, callback);
  }

  public startSpinning() {
    if (this.reels.length * this.startInterval > this.stopDelay) {
      throw new Error(
        `Invalid config: reels start after stop delay (${this.reels.length}*${this.startInterval} > ${this.stopDelay})`
      );
    }

    this.reelsFinishedSpinningCount = 0;

    for (const [i, reel] of this.reels.entries()) {
      gsap.delayedCall(i * this.startInterval, () => {
        reel.startSpinning();
        if (i === this.reels.length - 1) {
          this.emit("allStartedSpinning");
        }
      });
    }

    for (const [i, reel] of this.reels.entries()) {
      gsap.delayedCall(this.stopDelay + i * this.stopInterval, () => {
        reel.stopSpinning();
      });
    }
  }

  public stopSpinning() {
    for (const reel of this.reels) {
      reel.stopSpinning();
    }
  }
}
