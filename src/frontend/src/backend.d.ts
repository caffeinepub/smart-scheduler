import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;

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

export type UserRole = { __kind__: "Admin" } | { __kind__: "User" } | { __kind__: "Guest" };

export interface backendInterface {
    // Authorization mixin
    _initializeAccessControlWithSecret(userSecret: string): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    // App APIs
    seedData(): Promise<void>;
    createEvent(title: string, description: string, startTime: bigint, endTime: bigint, category: string, priority: string): Promise<Event>;
    getEvents(): Promise<Event[]>;
    updateEvent(id: bigint, title: string, description: string, startTime: bigint, endTime: bigint, category: string, priority: string): Promise<boolean>;
    deleteEvent(id: bigint): Promise<boolean>;
    createTask(title: string, description: string, dueDate: bigint, estimatedHours: number, priority: string): Promise<Task>;
    getTasks(): Promise<Task[]>;
    updateTask(id: bigint, title: string, description: string, dueDate: bigint, estimatedHours: number, priority: string, status: string): Promise<boolean>;
    deleteTask(id: bigint): Promise<boolean>;
    getConflicts(): Promise<ConflictPair[]>;
    getWorkloadByDay(startMs: bigint, endMs: bigint): Promise<DayLoad[]>;
}
