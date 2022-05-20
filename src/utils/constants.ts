export default {
  WORLD_SIZE: 1000,
  PLAYER_SPEED: 120,
  PLAYER_RADIUS: 10,
  ROOM_NAME: "arena",
  NETWORK_BROADCAST_RATE: 1000 / 20, // 50ms = 20 packets a second
  SIMULATION_TICK_RATE: 1000 / 60, // 16.66 = 60fps
  ROCKET_RADIUS: 5,
  ROCKET_SPEED: 60,
  ROCKET_START_SPEED: 100,
  ROCKET_MAX_SPEED: 400,
  ROCKET_SPEED_INCREASE: 0.2,
  BOT_ENABLED: true,
  BOT_COUNT: 5,
  SIMULATED_LATENCY: 20,
};
