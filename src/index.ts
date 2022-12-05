import { Master } from "./master";
import { createMQTTConnection } from "./mqtt";
import topics from "./topics";
import { random } from "./utils";
import { Worker } from "./worker";

function die(msg) {
    console.error(msg);
    process.exit(1)
}

const mode = process.argv[2];
if (!mode) die("");

if (mode === 'master') {
    const master = new Master();
    master.start()
    setInterval(() => {
        const client = createMQTTConnection();
        client.publish(topics.newTransaction, JSON.stringify(generateSimulationData()))
    }, 200)
} else if (mode === 'worker') {
    const worker = new Worker();
    worker.start()
} else {
    die(`invalid mode provided: ${mode}`)
}

function generateSimulationData() {
    const length = random(1, 20);
    return Array.from({length}, () => [random(1, 10), random(1, 10)]); //
}
