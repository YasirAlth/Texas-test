export interface ExpLogDataEntry {
  _id: string;
  timestamp: Date;
  entryType: string;
  entryValue: string;
  entryLoggerDeviceName: string; // deviceName of device logging the entry
  loggerDeviceId: string; // unique key to track log owner even if device name changed during the experiment
}
