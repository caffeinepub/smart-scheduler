/* eslint-disable */

// @ts-nocheck

import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';
import type { Principal } from '@icp-sdk/core/principal';

export interface Event {
  id: bigint;
  title: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  category: string;
  priority: string;
  owner: Principal;
}

export interface Task {
  id: bigint;
  title: string;
  description: string;
  dueDate: bigint;
  estimatedHours: number;
  priority: string;
  status: string;
  owner: Principal;
}

export interface ConflictPair {
  eventId1: bigint;
  eventId2: bigint;
  title1: string;
  title2: string;
}

export interface DayLoad {
  date: string;
  loadScore: number;
  eventCount: bigint;
  taskCount: bigint;
}

export type UserRole = { Admin: null } | { User: null } | { Guest: null };

export interface _SERVICE {
  _initializeAccessControlWithSecret: ActorMethod<[string], void>;
  getCallerUserRole: ActorMethod<[], UserRole>;
  assignCallerUserRole: ActorMethod<[Principal, UserRole], void>;
  isCallerAdmin: ActorMethod<[], boolean>;
  seedData: ActorMethod<[], void>;
  createEvent: ActorMethod<[string, string, bigint, bigint, string, string], Event>;
  getEvents: ActorMethod<[], Event[]>;
  updateEvent: ActorMethod<[bigint, string, string, bigint, bigint, string, string], boolean>;
  deleteEvent: ActorMethod<[bigint], boolean>;
  createTask: ActorMethod<[string, string, bigint, number, string], Task>;
  getTasks: ActorMethod<[], Task[]>;
  updateTask: ActorMethod<[bigint, string, string, bigint, number, string, string], boolean>;
  deleteTask: ActorMethod<[bigint], boolean>;
  getConflicts: ActorMethod<[], ConflictPair[]>;
  getWorkloadByDay: ActorMethod<[bigint, bigint], DayLoad[]>;
}
export declare const idlService: IDL.ServiceClass;
export declare const idlInitArgs: IDL.Type[];
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
