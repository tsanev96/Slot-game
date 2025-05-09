import { Assets, Texture } from "pixi.js";

import { GameConfig } from "./config";

export class AssetLoader {
  private static instance: AssetLoader;

  private loadedTextures?: {
    [K in keyof GameConfig["assets"]]: GameConfig["assets"][K] extends Array<unknown>
      ? Texture[]
      : Texture;
  };

  private constructor() {
    if (AssetLoader.instance) {
      throw new Error("AssetLoader is a singleton");
    }

    AssetLoader.instance = this;
  }

  public static getInstance() {
    if (!AssetLoader.instance) {
      return new AssetLoader();
    }

    return AssetLoader.instance;
  }

  async load(gameConfig: GameConfig) {
    this.loadedTextures = Object.fromEntries(
      await Promise.all(
        Object.entries(gameConfig.assets).map(
          async ([name, assetPathOrPaths]) => {
            if (Array.isArray(assetPathOrPaths)) {
              return [
                name,
                await Promise.all(
                  assetPathOrPaths.map((assetPath) => Assets.load(assetPath))
                ),
              ];
            } else {
              return [name, await Assets.load(assetPathOrPaths)];
            }
          }
        )
      )
    );
  }

  getRandomSymbolTexture() {
    if (!this.loadedTextures) {
      throw new Error("Symbol textures not loaded yet");
    }

    const symbols = this.loadedTextures.symbols;
    return symbols[Math.floor(Math.random() * symbols.length)];
  }

  getTexture<K extends keyof GameConfig["assets"]>(name: K) {
    if (!this.loadedTextures) {
      throw new Error("Textures not loaded yet");
    }

    return this.loadedTextures[name];
  }
}
