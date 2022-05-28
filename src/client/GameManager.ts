import Phaser from 'phaser';
import ArenaScene from './ArenaScene';
import constants from '../utils/constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
	width: window.innerWidth,
	height: window.innerHeight,
  backgroundColor: 0x6495ED,
  pixelArt: true,
  scene: [ArenaScene],
};

export function initGame(): Phaser.Game {
  return new Phaser.Game(config);
}