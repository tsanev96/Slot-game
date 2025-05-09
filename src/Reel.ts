import gsap from "gsap";
import { Container } from "pixi.js";

import { ReelSymbol } from "./ReelSymbol";
import { AssetLoader } from "./AssetLoader";
import { GameConfig } from "./config";

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

  /** the amount of time it takes one symbol going to go one symbols's height down
      which is done repeatedly use in the spinning animation */
  private readonly spinningTweenDuration: number;

  constructor(config: GameConfig) {
    super();

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
          this.symbolHeight
        )
    );

    for (const [i, symbol] of this.symbols.entries()) {
      // the first symbol is actually placed above the reel area so while moving down there won't be a blank space
      symbol.y = (i - 1) * this.symbolHeight;
      this.addChild(symbol);
    }
  }

  public override on(
    event: ReelEvents | Parameters<Container["on"]>[0],
    callback: () => void
  ) {
    return super.on(event, callback);
  }

  public async startSpinning() {
    // ease in to the spinning animiation
    await gsap.to(this.position, {
      y: this.symbolHeight,
      duration: this.spinningTweenDuration * 2, // will approximately match the linear speed of the spinning, but would be good to calculate it explicitly
      ease: "power1.in",
    });
    this.loopReel();
    this.position.y = 0;

    this.needsToStop = false;

    // would prefer to use repeat but I think it doesn't work reliably in GSAP - https://github.com/greensock/GSAP/issues/593
    // this.spinningTween = gsap.to(this.position, {
    //   startAt: { y: 0 },
    //   y: this.symbolHeight,
    //   duration: this.spinningTweenDuration,
    //   ease: "none",
    //   repeat: Infinity,
    //   onRepeat: () => {
    //     this.loopReel();
    //   },
    // });
    // instead we simulate the above repeat like so:
    const tween = gsap.to(this.position, {
      // start animating twice the height and time
      y: this.symbolHeight * 2,
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

  /** moves all symbols 1 position down, and puts a random symbol on the top
      when the spinning animation is reset, the reel will go back one place, and the symbols down one place, visually staying in the same place */
  private loopReel() {
    for (const symbol of this.symbols) {
      symbol.position.y += this.symbolHeight;
      const eps = 0.1;
      // only the last reel will be close to the boundary
      // we use reuse it as the random symbol and move it to the top
      if (symbol.position.y >= this.reelAreaHeight - eps) {
        symbol.position.y = -this.symbolHeight;
        symbol.texture = AssetLoader.getInstance().getRandomSymbolTexture();
      }
    }
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

    await gsap.to(this.position, {
      y: this.symbolHeight,
      duration: this.spinningTweenDuration * 4, // approximately matches the spinning speed, but would be good to calculate it explicitly
      ease: "back.out",
      onUpdate: () => {
        // once the reel crosses the symbol height it will only go back
        // and we loop the last symbol to be visible at the top (without resetting the animation)
        if (!this.backoutStarted && this.position.y >= this.symbolHeight) {
          this.loopReel();
          for (const symbol of this.symbols) {
            symbol.position.y -= this.symbolHeight;
          }
          this.backoutStarted = true;
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
