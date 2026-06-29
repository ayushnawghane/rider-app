import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
}));

const { liveLocationService } = await import('./liveLocation');

const createQuery = (terminal: Record<string, unknown> = {}) => {
  const query: Record<string, unknown> = {
    select: vi.fn(() => query),
    upsert: vi.fn(() => query),
    insert: vi.fn(() => query),
    eq: vi.fn(() => query),
    neq: vi.fn(() => query),
    order: vi.fn(() => query),
    ...terminal,
  };
  return query as Record<string, any>;
};

describe('liveLocationService', () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.channel.mockReset();
    mocks.removeChannel.mockReset();
  });

  it('publishes a location via upsert on (ride_id,user_id) with timestamp', async () => {
    const query = createQuery();
    mocks.from.mockReturnValue(query);

    const result = await liveLocationService.publishLocation({
      rideId: 'ride-1',
      userId: 'user-1',
      lat: 12.34,
      lng: 56.78,
      accuracy: 5,
    });

    expect(result.success).toBe(true);
    expect(mocks.from).toHaveBeenCalledWith('live_locations');
    expect(query.upsert).toHaveBeenCalledTimes(1);

    const [payload, options] = (query.upsert as any).mock.calls[0];
    expect(payload).toEqual(
      expect.objectContaining({
        ride_id: 'ride-1',
        user_id: 'user-1',
        lat: 12.34,
        lng: 56.78,
        accuracy: 5,
        timestamp: expect.any(String),
      }),
    );
    expect(options).toEqual({ onConflict: 'ride_id,user_id' });
  });

  it('returns latest other participant locations, excluding the current user', async () => {
    const query = createQuery({
      order: vi.fn().mockResolvedValue({
        data: [
          {
            user_id: 'driver-1',
            lat: 1.1,
            lng: 2.2,
            accuracy: 4,
            timestamp: '2026-06-29T00:00:00.000Z',
          },
        ],
        error: null,
      }),
    });
    mocks.from.mockReturnValue(query);

    const locations = await liveLocationService.getLatestOtherLocations('ride-1', 'user-1');

    expect(mocks.from).toHaveBeenCalledWith('live_locations');
    expect(query.select).toHaveBeenCalledWith('user_id, lat, lng, accuracy, timestamp');
    expect(query.eq).toHaveBeenCalledWith('ride_id', 'ride-1');
    expect(query.neq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(query.order).toHaveBeenCalledWith('timestamp', { ascending: false });
    expect(locations).toEqual([
      {
        userId: 'driver-1',
        lat: 1.1,
        lng: 2.2,
        accuracy: 4,
        timestamp: '2026-06-29T00:00:00.000Z',
      },
    ]);
  });

  it('returns an empty list when the fetch errors out', async () => {
    const query = createQuery({
      order: vi.fn().mockResolvedValue({ data: null, error: new Error('boom') }),
    });
    mocks.from.mockReturnValue(query);

    const locations = await liveLocationService.getLatestOtherLocations('ride-1', 'user-1');
    expect(locations).toEqual([]);
  });

  it('subscribes with event * and forwards only other participants updates', () => {
    let captured: any;
    const channelObj: {
      on: ReturnType<typeof vi.fn>;
      subscribe: ReturnType<typeof vi.fn>;
    } = {
      on: vi.fn((_event: string, _filter: unknown, cb: any) => {
        captured = cb;
        return channelObj;
      }),
      subscribe: vi.fn(() => 'fake-channel'),
    };
    mocks.channel.mockReturnValue(channelObj);

    const received: any[] = [];
    const channel = liveLocationService.subscribeToRideLocations('ride-1', 'user-1', (loc) => {
      received.push(loc);
    });

    expect(mocks.channel).toHaveBeenCalledWith('live_locations:ride-1:user-1');
    expect(channelObj.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_locations',
        filter: 'ride_id=eq.ride-1',
      },
      expect.any(Function),
    );
    expect(channel).toBe('fake-channel');

    // Other participant -> forwarded
    captured({
      new: { user_id: 'driver-1', lat: 7, lng: 8, timestamp: '2026-06-29T00:00:00.000Z' },
      old: {},
    });
    // Own update -> ignored
    captured({
      new: { user_id: 'user-1', lat: 9, lng: 10 },
      old: {},
    });

    expect(received).toEqual([
      {
        userId: 'driver-1',
        lat: 7,
        lng: 8,
        accuracy: null,
        timestamp: '2026-06-29T00:00:00.000Z',
      },
    ]);
  });
});
