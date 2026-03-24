/* eslint-disable */

// @ts-nocheck

import { IDL } from '@icp-sdk/core/candid';

const Event = IDL.Record({
  id: IDL.Nat,
  title: IDL.Text,
  description: IDL.Text,
  startTime: IDL.Int,
  endTime: IDL.Int,
  category: IDL.Text,
  priority: IDL.Text,
  owner: IDL.Principal,
});

const Task = IDL.Record({
  id: IDL.Nat,
  title: IDL.Text,
  description: IDL.Text,
  dueDate: IDL.Int,
  estimatedHours: IDL.Float64,
  priority: IDL.Text,
  status: IDL.Text,
  owner: IDL.Principal,
});

const ConflictPair = IDL.Record({
  eventId1: IDL.Nat,
  eventId2: IDL.Nat,
  title1: IDL.Text,
  title2: IDL.Text,
});

const DayLoad = IDL.Record({
  date: IDL.Text,
  loadScore: IDL.Float64,
  eventCount: IDL.Nat,
  taskCount: IDL.Nat,
});

const UserRole = IDL.Variant({
  Admin: IDL.Null,
  User: IDL.Null,
  Guest: IDL.Null,
});

export const idlService = IDL.Service({
  _initializeAccessControlWithSecret: IDL.Func([IDL.Text], [], []),
  getCallerUserRole: IDL.Func([], [UserRole], ['query']),
  assignCallerUserRole: IDL.Func([IDL.Principal, UserRole], [], []),
  isCallerAdmin: IDL.Func([], [IDL.Bool], ['query']),
  seedData: IDL.Func([], [], []),
  createEvent: IDL.Func([IDL.Text, IDL.Text, IDL.Int, IDL.Int, IDL.Text, IDL.Text], [Event], []),
  getEvents: IDL.Func([], [IDL.Vec(Event)], ['query']),
  updateEvent: IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Int, IDL.Int, IDL.Text, IDL.Text], [IDL.Bool], []),
  deleteEvent: IDL.Func([IDL.Nat], [IDL.Bool], []),
  createTask: IDL.Func([IDL.Text, IDL.Text, IDL.Int, IDL.Float64, IDL.Text], [Task], []),
  getTasks: IDL.Func([], [IDL.Vec(Task)], ['query']),
  updateTask: IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Int, IDL.Float64, IDL.Text, IDL.Text], [IDL.Bool], []),
  deleteTask: IDL.Func([IDL.Nat], [IDL.Bool], []),
  getConflicts: IDL.Func([], [IDL.Vec(ConflictPair)], ['query']),
  getWorkloadByDay: IDL.Func([IDL.Int, IDL.Int], [IDL.Vec(DayLoad)], ['query']),
});

export const idlInitArgs = [];

export const idlFactory = ({ IDL }) => {
  const Event = IDL.Record({
    id: IDL.Nat,
    title: IDL.Text,
    description: IDL.Text,
    startTime: IDL.Int,
    endTime: IDL.Int,
    category: IDL.Text,
    priority: IDL.Text,
    owner: IDL.Principal,
  });

  const Task = IDL.Record({
    id: IDL.Nat,
    title: IDL.Text,
    description: IDL.Text,
    dueDate: IDL.Int,
    estimatedHours: IDL.Float64,
    priority: IDL.Text,
    status: IDL.Text,
    owner: IDL.Principal,
  });

  const ConflictPair = IDL.Record({
    eventId1: IDL.Nat,
    eventId2: IDL.Nat,
    title1: IDL.Text,
    title2: IDL.Text,
  });

  const DayLoad = IDL.Record({
    date: IDL.Text,
    loadScore: IDL.Float64,
    eventCount: IDL.Nat,
    taskCount: IDL.Nat,
  });

  const UserRole = IDL.Variant({
    Admin: IDL.Null,
    User: IDL.Null,
    Guest: IDL.Null,
  });

  return IDL.Service({
    _initializeAccessControlWithSecret: IDL.Func([IDL.Text], [], []),
    getCallerUserRole: IDL.Func([], [UserRole], ['query']),
    assignCallerUserRole: IDL.Func([IDL.Principal, UserRole], [], []),
    isCallerAdmin: IDL.Func([], [IDL.Bool], ['query']),
    seedData: IDL.Func([], [], []),
    createEvent: IDL.Func([IDL.Text, IDL.Text, IDL.Int, IDL.Int, IDL.Text, IDL.Text], [Event], []),
    getEvents: IDL.Func([], [IDL.Vec(Event)], ['query']),
    updateEvent: IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Int, IDL.Int, IDL.Text, IDL.Text], [IDL.Bool], []),
    deleteEvent: IDL.Func([IDL.Nat], [IDL.Bool], []),
    createTask: IDL.Func([IDL.Text, IDL.Text, IDL.Int, IDL.Float64, IDL.Text], [Task], []),
    getTasks: IDL.Func([], [IDL.Vec(Task)], ['query']),
    updateTask: IDL.Func([IDL.Nat, IDL.Text, IDL.Text, IDL.Int, IDL.Float64, IDL.Text, IDL.Text], [IDL.Bool], []),
    deleteTask: IDL.Func([IDL.Nat], [IDL.Bool], []),
    getConflicts: IDL.Func([], [IDL.Vec(ConflictPair)], ['query']),
    getWorkloadByDay: IDL.Func([IDL.Int, IDL.Int], [IDL.Vec(DayLoad)], ['query']),
  });
};

export const init = ({ IDL }) => { return []; };
