import { MqttClient } from "mqtt";
import { v4 as uuid } from "uuid";
import { createMQTTConnection } from "./mqtt";
import topics from "./topics";
import Dispatcher from "mqtt-dispatcher";
import { parseMessage, multiplicateArray, now, random } from "./utils";
import { TaskPayload } from "./types";

export class Worker {
    protected id: string;
    protected mqtt: MqttClient;
    protected dispatcher: Dispatcher;

    constructor() {
        this.id = uuid();
        this.mqtt = createMQTTConnection();
        this.dispatcher = new Dispatcher(this.mqtt);
    }

    start() {
        // discovery bypassed by continuous keepalive which will determine the runtime and discovery of a worker
        this.startKeepAlive();
        /**
         * subscribe and handle specific topics using dispatcher.
         * the function as second argument will only be invoked
         * when the topic the message was received on matches the
         * subscription topic - which could contain wildcards -.
         * this is all handled by the dispatcher library
         */
        this.dispatcher.addRule(
            topics.newTask(this.id),
            this.newTaskHandler.bind(this) // if the class method uses "this" inside, it must be bound in this way
        );
    }

    // don't need the first parameter, i'll use underscore as best practice
    protected newTaskHandler(_, message: Buffer) {
        const payload = parseMessage<TaskPayload>(message);
        if (!payload) return // prevent parsing wrong formatted messages
        // perform multiplication of all the tuples in the tasks list
        console.log("[worker]: new task:", JSON.stringify(payload.tasks))
        // simulate long computation time
        const computation = payload.tasks.reduce(
            (acc, [a, b]) => multiplicateArray([acc, a, b]),
            1
        );
        setTimeout(() => {
            this.sendResult(payload.taskId, computation);
        }, random(3, 7) * 1000);
    }

    protected sendResult(taskId: string, result: number) {
        console.log(`[worker]: done with result`, result)
        this.mqtt.publish(
            topics.taskCompleted(this.id, taskId),
            JSON.stringify({ taskId, result })
        );
    }

    protected startKeepAlive() {
        setInterval(() => {
            this.mqtt.publish(topics.keepAlive(this.id), now());
        }, 1000);
    }
}
