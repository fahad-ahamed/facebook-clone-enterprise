// Groups components barrel export
// This makes importing cleaner: import { GroupsList, CreateGroupModal } from '@/components/groups'

export { GroupsList, default as GroupsListComponent } from './GroupsList';
export type { Group, default as GroupType } from './GroupsList';

export { CreateGroupModal, default as CreateGroupModalComponent } from './CreateGroupModal';
export type { CreateGroupData } from './CreateGroupModal';
