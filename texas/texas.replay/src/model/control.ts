import { TexasDeviceMessage } from './message';

export interface Control extends TexasDeviceMessage {
    timestamp: Date;
    categoryId: number;
    primarySource: number;
    restart: boolean;
    updateRate: number;
    whiteList: string;
}