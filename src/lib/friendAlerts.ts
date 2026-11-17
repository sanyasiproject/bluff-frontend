import { loadPref, savePref } from './storage';

const key = (userId: string) => `friendAlerts.${userId}`;

/** "friend came online" alerts, on unless this player turned them off on this phone */
export const friendAlertsOn = (userId: string) => loadPref(key(userId)) !== 'off';
export const setFriendAlerts = (userId: string, on: boolean) => savePref(key(userId), on ? 'on' : 'off');
