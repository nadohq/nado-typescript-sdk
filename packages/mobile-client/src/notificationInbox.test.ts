import { describe, expect, it } from '@jest/globals';
import { mapMobileNotificationInboxV2 } from './dataMappers';
import { MobileServerNotificationInboxItem } from './types';

const notification: MobileServerNotificationInboxItem = {
  notification_id: '11111111-1111-4111-8111-111111111111',
  type_id: 'new_follower',
  created_at: 1792886400000,
  trade_within_24h: false,
  data: {
    payload_version: 2,
    notification_id: '11111111-1111-4111-8111-111111111111',
    recipient_wallet: '0x1111111111111111111111111111111111111111',
    type_id: 'new_follower',
    template_version: 1,
    route: {
      name: 'profile',
      subaccount:
        '0x222222222222222222222222222222222222222264656661756c740000000000',
    },
  },
};

describe('notification Inbox compatibility boundaries', () => {
  describe('first-seen state', () => {
    const cases: {
      name: string;
      wire: Pick<MobileServerNotificationInboxItem, 'seen_at'>;
      expected: number | null | undefined;
    }[] = [
      {
        name: 'older response without read state',
        wire: {},
        expected: undefined,
      },
      {
        name: 'explicit undefined read state',
        wire: { seen_at: undefined },
        expected: undefined,
      },
      { name: 'unread notification', wire: { seen_at: null }, expected: null },
      { name: 'zero timestamp', wire: { seen_at: 0 }, expected: 0 },
      {
        name: 'first acknowledgement timestamp',
        wire: { seen_at: 1792886400123 },
        expected: 1792886400123,
      },
    ];

    it.each(cases)(
      'preserves $name without inventing a read status',
      ({ wire, expected }) => {
        const page = mapMobileNotificationInboxV2({
          notifications: [{ ...notification, ...wire }],
          next_cursor: null,
        });
        const item = page.notifications[0];
        expect(item.seenAt).toBe(expected);
        expect(Object.hasOwn(item, 'seenAt')).toBe(expected !== undefined);
      },
    );
  });
});
