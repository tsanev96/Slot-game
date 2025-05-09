import gsap from "gsap";
import { Application } from "pixi.js";

import { gameConfig } from "./config";
import { AssetLoader } from "./AssetLoader";
import { Game } from "./Game";

async function main() {
  gsap.ticker.remove(gsap.updateRoot);

  const app = new Application<HTMLCanvasElement>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  await AssetLoader.getInstance().load(gameConfig);

  const game = new Game(gameConfig);

  game.pivot.set(game.width / 2, game.height / 2);
  game.position.set(window.innerWidth / 2, window.innerHeight / 2);

  app.stage.addChild(game);

  let elapsedMS = 0;

  app.ticker.add(() => {
    // using ms to use durations in ms in gsap tweens and config
    gsap.updateRoot(elapsedMS);
    elapsedMS += app.ticker.deltaMS;
  });

  document.body.appendChild(app.view);
}

main();
