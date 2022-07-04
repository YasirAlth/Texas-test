export enum MsgType {
  TRACK_UPDATE = 1,
  ALERT_UPDATE = 2,
  CONTROL_UPDATE = 3,
  REPORT = 4,
  REPLAY = 5
}

// A TEXAS message originating from a device
export interface TexasDeviceMessage extends TexasMessage {
  deviceId: string;
  deviceName: string;
}

// A TEXAS message, the message type is denoted by the "msgType" field
export interface TexasMessage {
  msgType: MsgType;
  timestamp: Date;
}