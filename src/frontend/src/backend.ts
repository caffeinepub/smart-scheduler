/* eslint-disable */

// @ts-nocheck

import { Actor, HttpAgent, type HttpAgentOptions, type ActorConfig, type Agent, type ActorSubclass } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";
import { idlFactory, type _SERVICE } from "./declarations/backend.did";
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
    _initializeAccessControlWithSecret(userSecret: string): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
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

export class ExternalBlob {
    _blob?: Uint8Array<ArrayBuffer> | null;
    directURL: string;
    onProgress?: (percentage: number) => void = undefined;
    private constructor(directURL: string, blob: Uint8Array<ArrayBuffer> | null){
        if (blob) { this._blob = blob; }
        this.directURL = directURL;
    }
    static fromURL(url: string): ExternalBlob {
        return new ExternalBlob(url, null);
    }
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob {
        const url = URL.createObjectURL(new Blob([new Uint8Array(blob)], { type: 'application/octet-stream' }));
        return new ExternalBlob(url, blob);
    }
    public async getBytes(): Promise<Uint8Array<ArrayBuffer>> {
        if (this._blob) return this._blob;
        const response = await fetch(this.directURL);
        const blob = await response.blob();
        this._blob = new Uint8Array(await blob.arrayBuffer());
        return this._blob;
    }
    public getDirectURL(): string { return this.directURL; }
    public withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob {
        this.onProgress = onProgress;
        return this;
    }
}

export class Backend implements backendInterface {
    constructor(private actor: ActorSubclass<_SERVICE>, private _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, private _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, private processError?: (error: unknown) => never){}

    async _initializeAccessControlWithSecret(userSecret: string): Promise<void> {
        return this.actor._initializeAccessControlWithSecret(userSecret);
    }
    async getCallerUserRole(): Promise<UserRole> {
        const role = await this.actor.getCallerUserRole();
        if ('Admin' in role) return { __kind__: 'Admin' };
        if ('User' in role) return { __kind__: 'User' };
        return { __kind__: 'Guest' };
    }
    async assignCallerUserRole(user: Principal, role: UserRole): Promise<void> {
        const r = role.__kind__ === 'Admin' ? { Admin: null } : role.__kind__ === 'User' ? { User: null } : { Guest: null };
        return this.actor.assignCallerUserRole(user, r);
    }
    async isCallerAdmin(): Promise<boolean> { return this.actor.isCallerAdmin(); }
    async seedData(): Promise<void> { return this.actor.seedData(); }
    async createEvent(title: string, description: string, startTime: bigint, endTime: bigint, category: string, priority: string): Promise<Event> {
        return this.actor.createEvent(title, description, startTime, endTime, category, priority);
    }
    async getEvents(): Promise<Event[]> { return this.actor.getEvents(); }
    async updateEvent(id: bigint, title: string, description: string, startTime: bigint, endTime: bigint, category: string, priority: string): Promise<boolean> {
        return this.actor.updateEvent(id, title, description, startTime, endTime, category, priority);
    }
    async deleteEvent(id: bigint): Promise<boolean> { return this.actor.deleteEvent(id); }
    async createTask(title: string, description: string, dueDate: bigint, estimatedHours: number, priority: string): Promise<Task> {
        return this.actor.createTask(title, description, dueDate, estimatedHours, priority);
    }
    async getTasks(): Promise<Task[]> { return this.actor.getTasks(); }
    async updateTask(id: bigint, title: string, description: string, dueDate: bigint, estimatedHours: number, priority: string, status: string): Promise<boolean> {
        return this.actor.updateTask(id, title, description, dueDate, estimatedHours, priority, status);
    }
    async deleteTask(id: bigint): Promise<boolean> { return this.actor.deleteTask(id); }
    async getConflicts(): Promise<ConflictPair[]> { return this.actor.getConflicts(); }
    async getWorkloadByDay(startMs: bigint, endMs: bigint): Promise<DayLoad[]> {
        return this.actor.getWorkloadByDay(startMs, endMs);
    }
}

export interface CreateActorOptions {
    agent?: Agent;
    agentOptions?: HttpAgentOptions;
    actorOptions?: ActorConfig;
    processError?: (error: unknown) => never;
}

export function createActor(canisterId: string, _uploadFile: (file: ExternalBlob) => Promise<Uint8Array>, _downloadFile: (file: Uint8Array) => Promise<ExternalBlob>, options: CreateActorOptions = {}): Backend {
    const agent = options.agent || HttpAgent.createSync({ ...options.agentOptions });
    if (options.agent && options.agentOptions) {
        console.warn("Detected both agent and agentOptions passed to createActor. Ignoring agentOptions and proceeding with the provided agent.");
    }
    const actor = Actor.createActor<_SERVICE>(idlFactory, {
        agent,
        canisterId: canisterId,
        ...options.actorOptions
    });
    return new Backend(actor, _uploadFile, _downloadFile, options.processError);
}
