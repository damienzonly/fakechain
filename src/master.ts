import { MqttClient } from "mqtt";
import { createMQTTConnection } from "./mqtt";
import Dispatcher from "mqtt-dispatcher";
import topics from "./topics";
import { multiplicateArray, parseMessage, random } from "./utils";
import { WorkStatus, TaskResultPayload } from "./types";
import { v4 as uuid } from "uuid";
import db from "./db";

export class Master {
    protected mqtt: MqttClient;
    protected dispatcher: Dispatcher;
    protected timers: { [id: string]: NodeJS.Timeout } = {};
    protected status: WorkStatus = {};

    protected queue: { [id: string]: {workerId: string, result?: any}[] } = {}; // keeps track of who is working on every task id

    constructor() {
        this.mqtt = createMQTTConnection();
        this.dispatcher = new Dispatcher(this.mqtt);
    }

    start() {
        setInterval(() => {
            console.log(
                "workers status:",
                JSON.stringify(this.status, null, 2)
            );
        }, 2500);
        this.listenKeepAlives();
        this.dispatcher.addRule(
            topics.newTransaction,
            this.newTransactionHandler.bind(this)
        );
        this.dispatcher.addRule(
            topics.taskCompleted('+', '+'),
            this.taskCompletedHandler.bind(this)
        );
    }

    protected newTransactionHandler(_, message) {
        const payload = parseMessage<number[][]>(message);
        if (!payload) return;
        const taskId = uuid();
        this.queue[taskId] = [];
        let step = random(1, 4);
        const tmpQueue = {} as any;
        for (let i = 0; i < payload.length; i += step) {
            const eligible = this.getEligibleWorker();
            if (!eligible) {
                console.error(
                    "no available workers to process new transactions"
                );
                return;
            }
            const [workerId] = eligible;
            console.log("eligible worker:", workerId)
            const tasks = payload.slice(i, i + step);
            step += random(1, 4);
            if (workerId in tmpQueue)
                tmpQueue[workerId] = tmpQueue[workerId].concat(tasks);
            else tmpQueue[workerId] = tasks;
        }
        for (const workerId in tmpQueue) {
            console.log(`task ${taskId} assigned to ${workerId}`);
            this.mqtt.publish(
                topics.newTask(workerId),
                JSON.stringify({ taskId, tasks: tmpQueue[workerId] })
            );
            this.incrementLoad(workerId)
        }
        this.queue[taskId] = Object.keys(tmpQueue).map(id => ({workerId: id}))
    }

    protected taskCompletedHandler(topic: string, message) {
        const [,,workerId, taskId] = topic.split("/");
        const payload = parseMessage<TaskResultPayload>(message);
        if (typeof payload.result !== 'number') {
            console.error(`ignoring invalid result: ${payload} from worker ${workerId} on task ${taskId}`)
            return
        }
        if (!(payload.taskId in this.queue)) {
            console.error("ignoring client message on non existing task")
            return
        }
        const queueWorker = this.queue[taskId].find(item => item.workerId === workerId);
        if (!queueWorker) {
            console.error(`ignoring client not registered to work on task ${taskId}`)
            return
        }
        console.log(`[master]: worker ${workerId} finished ${taskId}`)
        queueWorker.result = payload;
        if (this.queue[taskId].every(item => item.result !== undefined)) {
            // merge results of every worker
            db.push({taskId, result: multiplicateArray(this.queue[taskId].map(item => item.result))})
            for (const {workerId} of this.queue[taskId]) {
                this.decrementLoad(workerId);
            }
            delete this.queue[taskId]
        }
    }

    protected async upsertWorkerToCache(id: string) {
        const _now = Date.now();
        if (!(id in this.status)) this.status[id] = { load: 0, ts: _now };
        this.status[id].ts = _now;
    }

    protected getLoad(id: string) {
        return this.status[id].load;
    }

    protected setLoad(id: string, value = 0) {
        return (this.status[id].load = value);
    }

    protected getEligibleWorker() {
        return (
            Object.entries(this.status).sort(
                ([_, aVal], [__, bVal]) => aVal.load - bVal.load
            )[0] || null
        );
    }

    protected incrementLoad(id: string) {
        this.status[id].load++;
    }

    protected async decrementLoad(id: string) {
        if (this.status[id].load === 0) return;
        this.status[id].load--;
    }

    protected listenKeepAlives() {
        this.dispatcher.addRule(
            topics.keepAlive("+"),
            async (topic: string, message) => {
                const payload = parseMessage<number>(message);
                if (!payload) {
                    console.error("invalid keepalive");
                    return;
                }
                const id = topic.split("/")[2];
                clearTimeout(this.timers[id]);
                await this.upsertWorkerToCache(id);
                // expiration ttl for the worker
                this.timers[id] = setTimeout(() => {
                    delete this.status[id];
                }, 10000);
            }
        );
    }
}
