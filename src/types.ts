export interface TaskPayload {
    taskId: string;
    tasks: number[][]
}

export interface TaskResultPayload {
    taskId: string;
    result: number
}

export type KeepAliveMessage = string;

export interface WorkStatus {
    [x: string]: {
        load: number,
        ts: number
    }
}