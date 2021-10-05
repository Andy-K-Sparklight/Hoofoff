const { Server } = require("ws");
const { create, enableIntervalSave, markUse, loadData, saveDataSync, deactive } = require("./Data")

const SERVER = new Server({ port: 30280 });
const MAX_CONN = 200;
const MAX_STR_LENGTH = 32767;
let conns = 0;
enableIntervalSave();
loadData().then(() => {
    SERVER.on("connection", (ws) => {
        if (conns >= MAX_CONN) {
            ws.close(); // Reject
            return;
        }
        conns++;
        ws.on("close", () => {
            conns--;
        });
        let t = setTimeout(() => {
            ws.close();
        }, 3000);
        ws.on("message", (msg) => {
            clearTimeout(t);
            let mx = msg.toString();
            if (mx.length > MAX_STR_LENGTH) {
                ws.send("Request message too long!"); // Reject
                ws.close();
                return;
            }
            let o;
            try {
                o = JSON.parse(mx);
                if (typeof o !== "object") {
                    throw "";
                }
            } catch {
                ws.send("Invalid request data!"); // Reject
                ws.close();
                return;
            }
            try {
                ws.send(handleData(o));
            } catch (e) {
                ws.send(String(e));
                ws.close();
                return;
            }
        })
    });
    console.log("[WS] Started server.")
});
/*
Use:
{
    type: "use",
    id: "abcdef"
}

Create:
{
    type: "create",
    secret: string, used when deactive code
    ... the rest properties in Data.js
}

Deactive:
{
    type: "deactive",
    secret: string, uploaded when creating
    id: "abcdef"
}
*/


function handleData(d) {
    if (d.type === "use") {
        return markUse(d.id);
    }
    if (d.type === "create") {
        return create(d.baseVersion, d.premium, d.network, d.ip, d.port, d.password, d.message, d.count, d.expires, d.secret);
    }
    if (d.type === "deactive") {
        return deactive(d.id, d.secret);
    }
    return "Invalid type!"
}


process.on("SIGINT", () => {
    saveDataSync();
    process.exit();
});

process.on("SIGTERM", () => {
    saveDataSync();
    process.exit();
});
