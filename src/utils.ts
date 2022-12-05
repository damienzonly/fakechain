import { TaskPayload } from "./types";

export const now = () => `${Date.now()}`;

export function multiplicateArray(array: number[], i = 0) {
    if (i === array.length) return 1;
    return array[i] * multiplicateArray(array, i + 1);
}

export function parseMessage<T>(message: Buffer): T | null {
    let payload: TaskPayload;
    try {
        payload = JSON.parse(message.toString());
    } catch (e: any) {
        console.error("invalid json message:", message.toString(), e.toString());
        return null;
    }
    return payload as T
}

export function random(min = 1, max = 10) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}