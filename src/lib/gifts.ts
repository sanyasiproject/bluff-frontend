import { request } from './socket';

/** a gift goes to someone in my room (member id) or to a friend from the friends list (user id) */
export type GiftTarget = { memberId: string } | { userId: string };

/** gives a friend coins; resolves with my new balance and what I can still give today */
export const sendGift = (target: GiftTarget, amount: number) =>
  request<{ coins: number; giftLeft: number }>('friend:gift', { ...target, amount });
