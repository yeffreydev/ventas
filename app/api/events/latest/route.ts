import { NextRequest, NextResponse } from 'next/server';

// Store for latest events
let latestEvents: any[] = [];
const MAX_EVENTS = 50;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');
  const sinceTimestamp = since ? parseInt(since) : 0;

  // Filter events newer than 'since' timestamp
  const newEvents = latestEvents.filter(event => event.timestamp > sinceTimestamp);

  return NextResponse.json({
    events: newEvents,
    timestamp: Date.now(),
  });
}

// Function to add new event
export function addEvent(event: any) {
  const eventWithTimestamp = {
    ...event,
    timestamp: Date.now(),
  };

  latestEvents.unshift(eventWithTimestamp);

  // Keep only last MAX_EVENTS
  if (latestEvents.length > MAX_EVENTS) {
    latestEvents = latestEvents.slice(0, MAX_EVENTS);
  }

  console.log(`📝 Event stored. Total events in memory: ${latestEvents.length}`);
}