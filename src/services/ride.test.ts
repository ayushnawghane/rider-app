import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  functionsInvoke: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    functions: {
      invoke: mocks.functionsInvoke,
    },
  },
}));

const { rideService } = await import('./ride');

const createQuery = (terminal: Record<string, unknown> = {}) => {
  const query: Record<string, unknown> = {
    insert: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    upsert: vi.fn(() => query),
    update: vi.fn(() => query),
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    ilike: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    ...terminal,
  };
  return query as Record<string, any>;
};

const rideRow = {
  id: 'ride-1',
  user_id: 'driver-1',
  driver_id: 'driver-1',
  date: '2026-05-08T12:00:00.000Z',
  start_location: 'Bandra',
  end_location: 'Andheri',
  vehicle_type: 'sedan',
  vehicle_number: 'MH01AB1234',
  reference_id: 'REF-1',
  status: 'pending',
  available_seats: 3,
  booked_seats: 0,
  price_per_seat: 150,
  created_at: '2026-05-08T10:00:00.000Z',
  updated_at: '2026-05-08T10:00:00.000Z',
};

describe('rideService', () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.functionsInvoke.mockReset();
    mocks.functionsInvoke.mockResolvedValue({ data: { success: true, pointsAwarded: 50 }, error: null });
  });

  it('creates rides with safe default carpool fields', async () => {
    const query = createQuery({
      single: vi.fn().mockResolvedValue({ data: rideRow, error: null }),
    });
    mocks.from.mockReturnValue(query);

    const result = await rideService.createRide({
      userId: 'driver-1',
      date: rideRow.date,
      startLocation: 'Bandra',
      endLocation: 'Andheri',
      vehicleType: 'sedan',
      vehicleNumber: 'MH01AB1234',
      referenceId: 'REF-1',
    });

    expect(result.success).toBe(true);
    expect(result.ride?.id).toBe('ride-1');
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'driver-1',
      driver_id: 'driver-1',
      available_seats: 3,
      price_per_seat: 0,
      status: 'pending',
    }));
  });

  it('prevents drivers from joining their own ride', async () => {
    const ridesQuery = createQuery({
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'ride-1',
          user_id: 'driver-1',
          status: 'pending',
          available_seats: 3,
          booked_seats: 0,
          price_per_seat: 150,
          start_location: 'Bandra',
          end_location: 'Andheri',
        },
        error: null,
      }),
    });
    mocks.from.mockReturnValue(ridesQuery);

    const result = await rideService.joinRide({
      rideId: 'ride-1',
      userId: 'driver-1',
    });

    expect(result).toEqual({ success: false, error: 'You cannot join your own ride' });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it('upserts ride participation with at least one booked seat', async () => {
    const ridesQuery = createQuery({
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'ride-1',
          user_id: 'driver-1',
          status: 'pending',
          available_seats: 3,
          booked_seats: 0,
          price_per_seat: 150,
          start_location: 'Bandra',
          end_location: 'Andheri',
        },
        error: null,
      }),
    });
    const participantsQuery = createQuery({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'participant-1',
          ride_id: 'ride-1',
          user_id: 'passenger-1',
          seats_booked: 1,
          status: 'joined',
          created_at: '2026-05-08T10:00:00.000Z',
          updated_at: '2026-05-08T10:00:00.000Z',
        },
        error: null,
      }),
    });
    const bookingsQuery = createQuery();
    const profilesQuery = createQuery({
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          total_points: 20,
          level: 1,
          rides_taken: 2,
          rides_published: 0,
        },
        error: null,
      }),
    });
    const notificationsQuery = createQuery();
    mocks.from.mockImplementation((table: string) => (
      ({
        rides: ridesQuery,
        ride_participants: participantsQuery,
        bookings: bookingsQuery,
        profiles: profilesQuery,
        notifications: notificationsQuery,
      })[table] || createQuery()
    ));

    const result = await rideService.joinRide({
      rideId: 'ride-1',
      userId: 'passenger-1',
      seatsBooked: 0,
    });

    expect(result.success).toBe(true);
    expect(result.participant?.seatsBooked).toBe(1);
    expect(participantsQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ride_id: 'ride-1',
        user_id: 'passenger-1',
        seats_booked: 1,
        status: 'joined',
      }),
      { onConflict: 'ride_id,user_id' },
    );
    expect(ridesQuery.update).toHaveBeenCalledWith({ booked_seats: 1 });
    expect(bookingsQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      ride_id: 'ride-1',
      passenger_id: 'passenger-1',
      seats_booked: 1,
      total_price: 150,
      status: 'pending',
    }));
    expect(mocks.functionsInvoke).toHaveBeenCalledWith('ride-rewards', expect.objectContaining({
      body: expect.objectContaining({
        userId: 'passenger-1',
        rideId: 'ride-1',
        action: 'join_ride',
      }),
    }));
    expect(profilesQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      total_points: 20,
      rides_taken: 3,
    }));
    expect(notificationsQuery.insert).toHaveBeenCalledTimes(2);
  });

  it('returns joined rides where the user is a passenger', async () => {
    const driverQuery = createQuery({
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const participantQuery = createQuery({
      limit: vi.fn().mockResolvedValue({
        data: [{
          id: 'participant-1',
          ride: {
            ...rideRow,
            id: 'joined-ride',
            driver: {
              id: 'driver-1',
              full_name: 'Driver One',
              avatar_url: null,
              rating_as_driver: 4.9,
              phone: '+919999999999',
            },
          },
        }],
        error: null,
      }),
    });

    mocks.from.mockImplementation((table: string) => (
      table === 'rides' ? driverQuery : participantQuery
    ));

    const result = await rideService.getRides('passenger-1');

    expect(result.success).toBe(true);
    expect(result.rides).toHaveLength(1);
    expect(result.rides?.[0].id).toBe('joined-ride');
    expect(result.rides?.[0].userRole).toBe('passenger');
    expect(result.rides?.[0].driverContact).toBe('+919999999999');
  });

  it('composes ride search filters only when values are provided', async () => {
    const query = createQuery({
      limit: vi.fn().mockResolvedValue({ data: [rideRow], error: null }),
    });
    mocks.from.mockReturnValue(query);

    const result = await rideService.searchRides({
      startLocation: 'Band',
      endLocation: 'And',
      departureTime: '2026-05-08T00:00:00.000Z',
      limit: 10,
    });

    expect(result.success).toBe(true);
    expect(result.rides).toHaveLength(1);
    expect(query.in).toHaveBeenCalledWith('status', ['pending', 'active']);
    expect(query.ilike).toHaveBeenCalledWith('start_location', '%Band%');
    expect(query.ilike).toHaveBeenCalledWith('end_location', '%And%');
    expect(query.gte).toHaveBeenCalledWith('date', '2026-05-08T00:00:00.000Z');
    expect(query.order).toHaveBeenCalledWith('date', { ascending: true });
    expect(query.limit).toHaveBeenCalledWith(10);
  });
});
