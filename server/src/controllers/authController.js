const debug = require("debug")("emergency-room:auth");
const bcrypt = require("bcrypt");
const dbController = require("./dbController");
const wsController = require("./wsController");

module.exports.isAuthenticated = async (req, res) => {
  if (req.session.sessionData !== undefined && req.session.sessionData.role !== undefined && req.session.sessionData.username !== undefined && req.session.cookie.expires >= Date.now()) {
    res.json([{
      isAuthenticated: true,
      status: 200,
      message: "OK",
      role: req.session.sessionData.role,
      username: req.session.sessionData.username
    }]);
    return;
  }

  console.log("AUTH error > Not authenticated.");
  res.json([{
    isAuthenticated: false,
    status: 401,
    message: "Unauthorized",
    role: undefined,
    username: undefined
  }]);
};

module.exports.checkIfAuthenticated = async (req, res, next) => {
  if (req.session.sessionData !== undefined && req.session.sessionData.role !== undefined && req.session.sessionData.username !== undefined && req.session.cookie.expires >= Date.now()) {
    next();
    return;
  }

  console.log("AUTH error > Authentication required.");
  res.json([{
    isAuthenticated: false,
    status: 401,
    message: "Unauthorized",
    role: undefined,
    username: undefined
  }]);
};

module.exports.checkIfAuthorizedAsTriageNurse = async (req, res, next) => {
  if (req.session.sessionData !== undefined && req.session.sessionData.role !== undefined && req.session.sessionData.role === "triageNurse" && req.session.cookie.expires >= Date.now()) {
    next();
    return;
  }

  console.log(`AUTH error > Not authorized as ${req.session.sessionData.role}@${req.session.sessionData.username}.`);
  res.json([{
    isAuthenticated: false,
    status: 401,
    message: "Unauthorized",
    role: undefined,
    username: undefined
  }]);
};

module.exports.checkIfAuthorizedAsPhysicianTeam = async (req, res, next) => {
  // TODO: check if req.body.ID is on the list of the req.session.username patients
  if (req.session.sessionData !== undefined && req.session.sessionData.role !== undefined && req.session.sessionData.role === "physicianTeam" && req.session.cookie.expires >= Date.now()) {
    next();
    return;
  }

  console.log(`AUTH error > Not authorized as ${req.session.sessionData.role}@${req.session.sessionData.username}.`);
  res.json([{
    isAuthenticated: false,
    status: 401,
    message: "Unauthorized",
    role: undefined,
    username: undefined
  }]);
};

module.exports.setSession = async (req, res) => {
  try {
    const user = (await dbController.getProfessional(req.body.username))[0];
    if (!user) throw new Error("username incorrect");

    const match = bcrypt.compareSync(req.body.password, user.password);
    if (!match) throw new Error("password incorrect");

    const alreadySignedIn = await req.sessionStore.sessionModel.findAll({ attributes: ["sid"], where: { uid: user.ID } });
    alreadySignedIn.forEach((row) => {
      req.sessionStore.destroy(row.sid, (err) => {
        if (err) debug(err.toString());

        wsController.authNsp.to(user.username).emit("signOut");
        debug("EMIT -> signOut");

        ["/auth", "/api"].forEach((nsp) => {
          const socket = wsController.sockets.getSocket(nsp, row.sid);
          // do not close the underlying connection
          socket.disconnect(false);
        });
      });
    });

    req.session.uid = user.ID;
    req.session.sessionData = {
      uid: user.ID,
      role: user.role,
      username: user.username
    };

    req.session.save(async () => {
      const joined = await wsController.sockets.join(req);
      if (joined) {
        ["/auth", "/api"].forEach(async (nsp) => {
          const socket = wsController.sockets.getSocket(nsp, req.sessionID);
          await wsController.sockets.syncSession(socket);
          wsController.sockets.showStatus(socket);
        });
      }

      if (req.session.sessionData.role === "physicianTeam") {
        wsController.apiNsp.to("triageNurse").emit("isMedicationTime");
        debug("EMIT -> isMedicationTime");
      }

      res.json([{
        isAuthenticated: true,
        status: 200,
        message: "OK",
        role: req.session.sessionData.role,
        username: req.session.sessionData.username
      }]);
    });
  } catch (err) {
    console.log(`AUTH error > ${err.message}`);
    req.session.destroy(async () => {
      ["/auth", "/api"].forEach((nsp) => {
        const socket = wsController.sockets.getSocket(nsp, req.sessionID);
        // do not close the underlying connection
        socket.disconnect(false);
      });

      res.json([{
        isAuthenticated: false,
        status: 401,
        message: err.message,
        role: undefined,
        username: undefined
      }]);
    });
  }
};

module.exports.unsetSession = async (req, res) => {
  req.session.destroy(() => {
    ["/auth", "/api"].forEach((nsp) => {
      const socket = wsController.sockets.getSocket(nsp, req.sessionID);
      // do not close the underlying connection
      socket.disconnect(false);
    });

    res.json([{
      isAuthenticated: false,
      status: 401,
      message: "Unauthorized",
      role: undefined,
      username: undefined
    }]);
  });
};
