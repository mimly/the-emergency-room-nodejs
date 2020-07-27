const debug = require("debug")("emergency-room:ws");

class ERSockets {
  constructor () {
    this.sockets = [];
  }

  get length () {
    return this.sockets.length;
  }

  [Symbol.iterator] () {
    return this.sockets.values();
  }

  getSocket (nsp, sessionID) {
    return this.sockets.find((socket) => socket.handshake.sessionID === sessionID && socket.nsp.name === nsp);
  }

  addSocket (socket) {
    this.sockets.push(socket);
    debug(this.sockets.length);
  }

  removeSocket (socket) {
    const sessionID = socket.handshake.sessionID;
    const nsp = socket.nsp.name;
    this.sockets = this.sockets.filter((socket) => socket.handshake.sessionID !== sessionID || socket.nsp.name !== nsp);
    debug(this.sockets.length);
  }

  isInRoom (socket, room) {
    const rooms = Object.keys(socket.rooms);
    return rooms.indexOf(room) >= 0;
  }

  /**
   * Add socket to role and username rooms.
   * The parameter expects to be req or socket.handshake.
   *
   * @param sessionID
   * @param role
   * @param username
   * @param rest3
   * @param rest2
   * @param rest
   * @returns {Promise<any>}
   */
  join ({ sessionID, session: { sessionData: { role, username, ...rest3 } = {}, ...rest2 } = {}, ...rest }) {
    return new Promise((resolve, reject) => {
      try {
        if (role !== undefined && username !== undefined) {
          this.sockets
            .filter((socket) => socket.handshake.sessionID === sessionID && !this.isInRoom(socket, username))
            .forEach((socket) => {
              socket.join([role, username], () => {
                resolve(true);
              });
            });
        } else {
          resolve(false);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Remove socket from role and username rooms.
   * The parameter expects to be req or socket.handshake.
   *
   * @param sessionID
   * @param role
   * @param username
   * @param rest3
   * @param rest2
   * @param rest
   * @returns {Promise<any>}
   */
  leave ({ sessionID, session: { sessionData: { role, username, ...rest3 } = {}, ...rest2 } = {}, ...rest }) {
    return new Promise((resolve, reject) => {
      try {
        if (role !== undefined && username !== undefined) {
          this.sockets
            .filter((socket) => socket.handshake.sessionID === sessionID && this.isInRoom(socket, username))
            .forEach((socket) => {
              socket.leave(role, () => {
                socket.leave(username, () => {
                  resolve(true);
                });
              });
            });
        } else {
          resolve(false);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  syncSession ({ handshake: { sessionID, session, sessionStore, ...rest2 }, ...rest }) {
    return new Promise((resolve, reject) => {
      sessionStore.get(sessionID, (err, sess) => {
        if (err) reject(err);
        session.uid = (sess === undefined || sess === null) ? undefined : sess.uid;
        session.sessionData = (sess === undefined || sess === null) ? undefined : sess.sessionData;
        resolve();
      });
    });
  }

  // syncSession(socket) {
  //   return new Promise((resolve, reject) => {
  //     socket.handshake.sessionStore.get(socket.handshake.sessionID, (err, session) => {
  //       if (err) reject(err);
  //       socket.handshake.session.uid = (session === undefined || session === null) ? undefined : session.uid;
  //       socket.handshake.session.sessionData = (session === undefined || session === null) ? undefined : session.sessionData;
  //       resolve();
  //     });
  //   });
  // }

  showStatus ({ id, connected, handshake: { address, sessionID, session, ...rest2 }, rooms, ...rest }) {
    debug(`%O ${connected ? "CONNECTED ---" : "DISCONNECTED -/-"}\
    \nSocketID: %O\
    \nSessionID: %O\
    \nSession: %o\
    \nRooms: %O}`, address, id, sessionID, session, Object.keys(rooms));
  }

  // showStatus ({ id, connected, handshake: { address, sessionID, session, ...rest2 }, rooms, ...rest }) {
  //   debug(`${address} ${connected ? "CONNECTED ---" : "DISCONNECTED -/-"}\
  //   \nSocketID: ${id}\
  //   \nSessionID: ${sessionID}\
  //   \nSession: ${JSON.stringify(session)}\
  //   \nRooms: ${Object.keys(rooms)}`);
  // }
}

const sockets = new ERSockets();
module.exports.sockets = sockets;

module.exports.authNsp = undefined;

module.exports.apiNsp = undefined;

module.exports.init = (io) => {
  const authNsp = io
    .of("/auth")
    .on("connection", socket => authController(authNsp, socket));

  const apiNsp = io
    .of("/api")
    .on("connection", socket => apiController(apiNsp, socket));

  module.exports.authNsp = authNsp;
  module.exports.apiNsp = apiNsp;
};

const authController = async (authNsp, socket) => {
  await sockets.syncSession(socket);
  sockets.addSocket(socket);
  await sockets.join(socket.handshake);
  sockets.showStatus(socket);

  socket.on("disconnect", async () => {
    await sockets.syncSession(socket);
    sockets.removeSocket(socket);
    sockets.showStatus(socket);
  });
};

const apiController = async (apiNsp, socket) => {
  await sockets.syncSession(socket);
  sockets.addSocket(socket);
  await sockets.join(socket.handshake);
  sockets.showStatus(socket);

  socket.on("medicationTime", async (msg) => {
    debug("ON -> medicationTime");

    if (socket.handshake.session.sessionData !== undefined && socket.handshake.session.sessionData.role === "triageNurse") {
      socket.to("physicianTeam").emit("medicationTime", msg);
      debug("EMIT -> medicationTime");
    }
  });

  socket.on("clearMedicationTime", async () => {
    debug("ON -> clearMedicationTime");

    if (socket.handshake.session.sessionData !== undefined && socket.handshake.session.sessionData.role === "triageNurse") {
      socket.to("physicianTeam").emit("clearMedicationTime");
      debug("EMIT -> clearMedicationTime");
    }
  });

  socket.on("disconnect", async () => {
    await sockets.syncSession(socket);
    sockets.removeSocket(socket);
    sockets.showStatus(socket);
  });
};
