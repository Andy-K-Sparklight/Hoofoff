const { Server } = require("ws");
const {
  create,
  enableIntervalSave,
  markUse,
  loadData,
  saveDataSync,
  deactive,
} = require("./Data");

const IP_LIMIT = {};
const SERVER = new Server({ port: 30280 });
const MAX_CONN = 500;
const MAX_STR_LENGTH = 32767;
let conns = 0;
const MAX_REQS_PER_IP = 5;
const RESET_TIME = 600000;
enableIntervalSave();
loadData().then(() => {
  SERVER.on("connection", (ws, req) => {
    const addr = req.socket.remoteAddress;
    if (IP_LIMIT[addr] >= MAX_REQS_PER_IP) {
      console.log(`${addr} created too many requests!`);
      ws.close();
      return;
    }
    IP_LIMIT[addr] = (IP_LIMIT[addr] || 0) + 1;
    if (IP_LIMIT[addr] === 1) {
      setTimeout(() => {
        console.log(`${addr} reset.`);
        IP_LIMIT[addr] = 0;
      }, RESET_TIME);
    }
    if (conns >= MAX_CONN) {
      ws.close(); // Reject
      return;
    }
    conns++;
    ws.on("close", () => {
      conns--;
    });
    let t = setTimeout(() => {
      console.log(`Forcefully closed request from ${addr}`);
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
        ws.close();
      } catch (e) {
        ws.send(String(e));
        ws.close();
        return;
      }
    });
  });

  console.log("[WS] Started server.");
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
    return create(
      d.baseVersion,
      d.premium,
      d.network,
      d.ip,
      d.port,
      d.password,
      d.message,
      d.count,
      d.expires,
      d.secret
    );
  }
  if (d.type === "deactive") {
    return deactive(d.id, d.secret);
  }
  return "Invalid type!";
}

process.on("SIGINT", () => {
  saveDataSync();
  process.exit();
});

process.on("SIGTERM", () => {
  saveDataSync();
  process.exit();
});
