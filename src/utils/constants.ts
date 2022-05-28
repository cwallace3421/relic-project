export default {
  ROOM_NAME: "arena",
  WORLD_SIZE: 800,

  NETWORK_BROADCAST_RATE: 1000 / 20, // 50ms = 20 packets a second
  SIMULATION_TICK_RATE: 1000 / 60, // 16.66 = 60fps
  SIMULATED_LATENCY: 20, // this is latency for both outgoing and incoming, so this value is doubled in the real world

  PLAYER_SPEED: 120,
  PLAYER_RADIUS: 10,
  DEFLECT_RADIUS: 48,

  ROCKET_RADIUS: 5,
  ROCKET_START_SPEED: 140,
  ROCKET_MAX_SPEED: 340,
  ROCKET_SPEED_INCREASE: 0.05,

  BOT_ENABLED: true,
  BOT_COUNT: 5,

  ROOM_SIZE: 5,
};
