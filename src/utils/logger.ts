export enum LogLevels {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  DEBUG = "debug"
}

export enum LogCodes {
  ARENA_ROOM = "ARENA_ROOM",
  SERVER_PLAYER = "SERVER_PLAYER",
  SERVER_ROCKET = "SERVER_ROCKET",
  SERVER_BOT = "SERVER_BOT",
  CLIENT_ENTITY_INTERP = "CLIENT_ENTITY_INTERP",
  CLIENT_ENTITY_INFO = "CLIENT_ENTITY_INFO",
  CLIENT_ENTITY_ERROR = "CLIENT_ENTITY_ERROR",
  CLIENT_APPLICATION = "CLIENT_APPLICATION",
}

const log = (level: LogLevels, message: string, logCode: LogCodes, data?: any): void => {
  if (data) {
    console[level](message, logCode, data);
  } else {
    console[level](message, logCode);
  }
};

export default {
  info: (message: string, logCode: LogCodes, data?: any) => log(LogLevels.INFO, message, logCode, data),
  warn: (message: string, logCode: LogCodes, data?: any) => log(LogLevels.WARN, message, logCode, data),
  error: (message: string, logCode: LogCodes, data?: any) => log(LogLevels.ERROR, message, logCode, data),
  debug: (message: string, logCode: LogCodes, data?: any) => log(LogLevels.DEBUG, message, logCode, data),
};
