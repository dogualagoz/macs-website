import { sortEventsByProximity } from './eventOrder';

const NOW = new Date('2026-11-21T12:00:00Z');

const ids = (events) => events.map((event) => event.id);

describe('sortEventsByProximity', () => {
  it('puts upcoming events first, nearest start date first', () => {
    const events = [
      { id: 'far', start_time: '2027-01-10T10:00:00' },
      { id: 'near', start_time: '2026-11-25T10:00:00' },
      { id: 'mid', start_time: '2026-12-05T10:00:00' },
    ];

    expect(ids(sortEventsByProximity(events, NOW))).toEqual(['near', 'mid', 'far']);
  });

  it('lists past events after upcoming ones, most recent first', () => {
    const events = [
      { id: 'old', start_time: '2026-01-01T10:00:00' },
      { id: 'next', start_time: '2026-11-30T10:00:00' },
      { id: 'recent', start_time: '2026-11-10T10:00:00' },
    ];

    expect(ids(sortEventsByProximity(events, NOW))).toEqual(['next', 'recent', 'old']);
  });

  it('treats an ongoing event as upcoming', () => {
    const events = [
      { id: 'later', start_time: '2026-11-28T10:00:00' },
      { id: 'ongoing', start_time: '2026-11-21T10:00:00', end_time: '2026-11-21T15:00:00' },
    ];

    expect(ids(sortEventsByProximity(events, NOW))).toEqual(['ongoing', 'later']);
  });

  it('pushes events without a readable date to the end', () => {
    const events = [
      { id: 'undated', start_time: null },
      { id: 'dated', start_time: '2026-12-01T10:00:00' },
    ];

    expect(ids(sortEventsByProximity(events, NOW))).toEqual(['dated', 'undated']);
  });

  it('does not mutate the input array', () => {
    const events = [
      { id: 'b', start_time: '2026-12-10T10:00:00' },
      { id: 'a', start_time: '2026-12-01T10:00:00' },
    ];

    sortEventsByProximity(events, NOW);
    expect(ids(events)).toEqual(['b', 'a']);
  });
});
