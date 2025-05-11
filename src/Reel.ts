import gsap from "gsap";
import { Container } from "pixi.js";

import { ReelSymbol } from "./ReelSymbol";
import { AssetLoader } from "./AssetLoader";
import { GameConfig } from "./config";
import { MovingDirection } from "./types";

export enum ReelEvents {
  stoppedSpinning = "stoppedSpinning",
}

export class Reel extends Container {
  private symbols: ReelSymbol[];

  /** if the reel is currently in the stopping animation */
  private stopping = false;

  /** if the reel is currently in the backout part of the stopping animation
      used to loop the reels once when it starts to not show a blank space */
  private backoutStarted = false;

  /** if the reel needs to stop spinning, it will currently stop on the next loop
      we use a variable instead of directly stopping for 2 reasons:
        1. to ensure animation consistency by stopping from the next coming symbol
        2. to have the possibility to wait for a result before stopping (not implemented in the demo) */
  private needsToStop = false;

  private readonly symbolWidth: number;
  private readonly symbolHeight: number;
  private readonly reelAreaWidth: number;
  private readonly reelAreaHeight: number;
  private readonly movingDirection: MovingDirection;

  /** the amount of time it takes one symbol going to go one symbols's height down
      which is done repeatedly use in the spinning animation */
  private readonly spinningTweenDuration: number;

  constructor(config: GameConfig) {
    super();

    this.movingDirection = config.movingDirection;
    this.reelAreaWidth = config.reelAreaWidth;
    this.reelAreaHeight = config.reelAreaHeight;
    this.symbolWidth = this.reelAreaWidth / config.reelsCount;
    this.symbolHeight = this.reelAreaHeight / config.symbolsPerReel;
    this.spinningTweenDuration =
      1000 / (config.symbolsPerReel * config.spinningSpeed);

    this.symbols = Array.from(
      // while animating, we see two halves of 2 different symbols on the top and bottom, so it +1 symbols in total
      { length: config.symbolsPerReel + 1 },
      () =>
        new ReelSymbol(
          AssetLoader.getInstance().getRandomSymbolTexture(),
          this.symbolWidth,
          this.symbolHeight,
        ),
    );

    // down: first symbol placed above the reel area
    // up: first symbol placed below the reel area
    for (const [i, symbol] of this.symbols.entries()) {
      const index = this.movingDirection === MovingDirection.DOWN ? i - 1 : i;
      symbol.y = index * this.symbolHeight;
      this.addChild(symbol);
    }
  }

  public override on(
    event: ReelEvents | Parameters<Container["on"]>[0],
    callback: () => void,
  ) {
    return super.on(event, callback);
  }

  public async startSpinning() {
    const initialShiftReelDirection =
      this.movingDirection === MovingDirection.DOWN
        ? this.symbolHeight
        : -this.symbolHeight;
    // ease in to the spinning animiation
    await gsap.to(this.position, {
      y: initialShiftReelDirection,
      duration: this.spinningTweenDuration * 2, // will approximately match the linear speed of the spinning, but would be good to calculate it explicitly
      ease: "power1.in",
    });
    this.loopReel();
    this.position.y = 0;
    // return; // single spin

    this.needsToStop = false;

    const tween = gsap.to(this.position, {
      // start animating twice the height and time
      y:
        this.symbolHeight *
        2 *
        (this.movingDirection === MovingDirection.DOWN ? 1 : -1),
      duration: this.spinningTweenDuration * 2,
      ease: "none",
      onUpdate: () => {
        const time = tween.time();
        // when we cross the spinning duration (and equvalently 1 symbol height)
        // we loop the reel and restart the animation (accounting for the time passed)
        if (time > this.spinningTweenDuration) {
          this.loopReel();
          tween.time(time % this.spinningTweenDuration, true);
          if (this.needsToStop) {
            tween.pause();
            this.beginStoppingAnimation();
          }
        }
      },
    });
  }

  private updateSymbolPosition(symbol: ReelSymbol) {
    const eps = 0.1;
    const directionIsDown = this.movingDirection === MovingDirection.DOWN;
    const movementY = directionIsDown ? this.symbolHeight : -this.symbolHeight;

    symbol.position.y += movementY;

    const hasMovedOffscreen = directionIsDown
      ? symbol.position.y >= this.reelAreaHeight - eps
      : symbol.position.y <= -this.symbolHeight + eps;

    if (hasMovedOffscreen) {
      symbol.position.y = directionIsDown
        ? -this.symbolHeight // moves at the top - hidden
        : this.reelAreaHeight; // moves at the bottom - hidden
      symbol.texture = AssetLoader.getInstance().getRandomSymbolTexture();
    }
  }
  /** moves all symbols 1 position down, and puts a random symbol on the top
      when the spinning animation is reset, the reel will go back one place, and the symbols down one place, visually staying in the same place */
  private loopReel() {
    this.symbols.forEach(this.updateSymbolPosition.bind(this));
  }

  public stopSpinning() {
    this.needsToStop = true;
  }

  public async beginStoppingAnimation() {
    if (this.stopping) {
      // could be stopping from multiple sources, if it's already stopping, we let the animation continue
      return;
    }

    this.stopping = true;
    this.backoutStarted = false;

    const reelStartY =
      this.movingDirection === MovingDirection.DOWN
        ? this.symbolHeight
        : -this.symbolHeight;

    await gsap.to(this.position, {
      y: reelStartY,
      duration: this.spinningTweenDuration * 4, // approximately matches the spinning speed, but would be good to calculate it explicitly
      ease: "back.out",
      onUpdate: () => {
        // Check if the reel has crossed the symbol height threshold (either up or down)
        // and adjust the symbols to loop seamlessly without restarting the animation.
        const crossedUpperThreshold = this.position.y >= this.symbolHeight;
        const crossedLowerThreshold = this.position.y <= -this.symbolHeight;

        const isTreshholdCrossed =
          crossedUpperThreshold || crossedLowerThreshold;

        if (!this.backoutStarted && isTreshholdCrossed) {
          this.loopReel();

          // Shift all symbols by one symbol height in the appropriate direction,
          // to simulate looping effect at the top or bottom of the reel.
          const shift =
            this.movingDirection === MovingDirection.UP
              ? this.symbolHeight // move symbols down if reel moves up
              : -this.symbolHeight; // move symbols up if reel moves down

          for (const symbol of this.symbols) {
            symbol.position.y += shift;
          }

          // Mark that the backout behavior has started so it doesn't repeat unnecessarily
          if (crossedUpperThreshold) {
            this.backoutStarted = true;
          }
        }
      },
    });

    // we loop the reel once more to reset the board for the next spin
    this.loopReel();
    this.position.y = 0;

    this.stopping = false;
    this.emit(ReelEvents.stoppedSpinning);
  }
}
