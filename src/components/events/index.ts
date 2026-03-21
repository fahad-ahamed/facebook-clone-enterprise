// Events components barrel export
// Makes importing cleaner: import { EventsList, CreateEventModal } from '@/components/events'

export { EventsList, default as EventsListComponent } from './EventsList';
export type { Event, default as EventType, RsvpStatus } from './EventsList';

export { CreateEventModal, default as CreateEventModalComponent } from './CreateEventModal';
export type { CreateEventData } from './CreateEventModal';
