import { Master } from "./master";
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
} else if (mode === 'worker') {
    const worker = new Worker();
    worker.start()
} else {
    die(`invalid mode provided: ${mode}`)
}