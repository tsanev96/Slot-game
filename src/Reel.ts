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
    // for (const [i, symbol] of this.symbols.entries()) {
    //   const index = this.movingDirection === MovingDirection.DOWN ? i - 1 : i;
    //   symbol.y = index * this.symbolHeight;
    //   this.addChild(symbol);
    // }

    for (const [i, symbol] of this.symbols.entries()) {
      let index = i;

      switch (this.movingDirection) {
        case MovingDirection.DOWN:
          index = i - 1; // start one symbol above
          symbol.y = index * this.symbolHeight;
          symbol.x = 0;
          break;

        case MovingDirection.UP:
          // no change to index
          symbol.y = index * this.symbolHeight;
          symbol.x = 0;
          break;

        case MovingDirection.LEFT:
          index = i; // optionally adjust if needed
          symbol.x = index * this.symbolWidth;
          symbol.y = 0;
          break;

        case MovingDirection.RIGHT:
          index = i - 1; // shift left by one symbol
          symbol.x = index * this.symbolWidth;
          symbol.y = 0;
          break;
      }

      this.addChild(symbol);
    }
  }

  private getReelPosition() {
    switch (this.movingDirection) {
      case MovingDirection.DOWN:
        return {
          x: this.position.x,
          y: this.symbolHeight,
        };
      case MovingDirection.UP:
        return {
          y: -this.symbolHeight,
          x: this.position.x,
        };
      case MovingDirection.LEFT:
        // todo gameare width + this.symbolWidth
        return {
          x: -this.symbolWidth, //this.position.x - this.symbolWidth,
          y: this.position.y,
        };
      case MovingDirection.RIGHT:
        // todo
        return {
          x: 0,
          y: this.position.y,
        };
      default:
        throw new Error("Invalid moving direction");
    }
  }

  public override on(
    event: ReelEvents | Parameters<Container["on"]>[0],
    callback: () => void,
  ) {
    return super.on(event, callback);
  }

  private getSpinningReelPosition() {
    switch (this.movingDirection) {
      case MovingDirection.DOWN:
        return {
          y: this.position.y + this.symbolHeight * 2,
          x: this.position.x,
        };
      case MovingDirection.UP:
        return {
          y: this.position.y - this.symbolHeight * 2,
          x: this.position.x,
        };
      case MovingDirection.RIGHT:
        return {
          x: this.position.x + this.symbolWidth * 2,
          y: this.position.y,
        };
      case MovingDirection.LEFT:
        return {
          x: this.position.x - this.symbolWidth * 2,
          y: this.position.y,
        };
      default:
        throw new Error("Invalid moving direction");
    }
  }

  public async startSpinning(i: number) {
    const { x, y } = this.getReelPosition();
    // ease in to the spinning animiation
    await gsap.to(this.position, {
      x,
      y,
      duration: this.spinningTweenDuration * 2, // will approximately match the linear speed of the spinning, but would be good to calculate it explicitly
      ease: "power1.in",
    });
    this.loopReel();
    // this.position.y = i * ; // Y axis

    // this.position.x = 0; //i * this.symbolWidth;
    // return; // single spin

    this.needsToStop = false;

    const { x: tweenX, y: tweenY } = this.getSpinningReelPosition();

    console.log("tweenX", tweenX);
    const tween = gsap.to(this.position, {
      // start animating twice the height/width and time
      x: tweenX,
      y: tweenY,
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

  private getSymbolMovementDirection(symbol: ReelSymbol) {
    switch (this.movingDirection) {
      case MovingDirection.DOWN:
        return {
          x: symbol.position.x,
          y: this.symbolHeight,
        };
      case MovingDirection.UP:
        return {
          x: symbol.position.x,
          y: -this.symbolHeight,
        };
      case MovingDirection.LEFT:
        return {
          x: -this.symbolWidth,
          y: 0,
        };
      // todo
      case MovingDirection.RIGHT:
        return {
          x: this.symbolWidth,
          y: 0,
        };
      default:
        throw new Error("Invalid moving direction");
    }
  }

  private isSymbolOffScreen(
    symbol: ReelSymbol,
    eps: number,
  ): { xAdjust: number; yAdjust: number } {
    switch (this.movingDirection) {
      case MovingDirection.DOWN:
        if (symbol.position.y >= this.reelAreaHeight - eps) {
          return { xAdjust: 0, yAdjust: -this.reelAreaHeight }; // example wrap/reset logic
        }
        break;
      case MovingDirection.UP:
        if (symbol.position.y <= -this.symbolHeight + eps) {
          return { xAdjust: 0, yAdjust: this.reelAreaHeight };
        }
        break;
      case MovingDirection.RIGHT:
        if (symbol.position.x >= this.reelAreaWidth - eps) {
          return { xAdjust: -this.reelAreaWidth, yAdjust: 0 };
        }
        break;
      case MovingDirection.LEFT:
        if (symbol.position.x <= -this.symbolWidth + eps) {
          return { xAdjust: this.reelAreaWidth + this.symbolWidth, yAdjust: 0 };
        }
        break;
    }

    return { xAdjust: 0, yAdjust: 0 };
  }

  private shiftSymbolPosition(symbol: ReelSymbol) {
    const eps = 0.1;
    const { x, y } = this.getSymbolMovementDirection(symbol);
    symbol.position.y += y;
    symbol.position.x += x;

    const { xAdjust, yAdjust } = this.isSymbolOffScreen(symbol, eps);

    if (xAdjust !== 0 || yAdjust !== 0) {
      // change the symbol only if it has moved off screen
      symbol.texture = AssetLoader.getInstance().getRandomSymbolTexture();
      symbol.position.x += xAdjust;
      symbol.position.y += yAdjust;
    }
  }
  /** moves all symbols 1 position down, and puts a random symbol on the top
      when the spinning animation is reset, the reel will go back one place, and the symbols down one place, visually staying in the same place */
  private loopReel() {
    this.symbols.forEach(this.shiftSymbolPosition.bind(this));
  }

  public stopSpinning() {
    this.needsToStop = true;
  }

  public async beginStoppingAnimation() {
    return;
    if (this.stopping) {
      // could be stopping from multiple sources, if it's already stopping, we let the animation continue
      return;
    }

    const { x, y } = this.getReelPosition();

    this.stopping = true;
    this.backoutStarted = false;

    await gsap.to(this.position, {
      x,
      y,
      duration: this.spinningTweenDuration * 3, // approximately matches the spinning speed, but would be good to calculate it explicitly
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
