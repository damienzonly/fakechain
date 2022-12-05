import { connect } from "mqtt";

export function createMQTTConnection() {
    const client = connect('broker.emqx.io');
    client
        .on("connect", () => {
            console.log("client connected");
        })
        .on("error", (e) => {
            console.error("mqtt error:", e.toString());
        });
    return client;
}