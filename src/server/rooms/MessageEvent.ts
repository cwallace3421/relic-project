import { Schema, type, MapSchema, filterChildren } from "@colyseus/schema";

export class MessageEvent extends Schema {
  @type("uint64")
  timestamp: number = 0;
}