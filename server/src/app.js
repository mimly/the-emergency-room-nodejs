#!/usr/bin/env node

process.env.NODE_ENV = "development";
// process.env.NODE_ENV = 'production';

(async () => {
  // const debug = require("debug")("emergency-room");
  const http = require("http");
  const https = require("https");
  const fs = require("fs");
  const path = require("path");
  const express = require("express");
  const app = express();

  /**
   * Set up better-logging.
   */

  const chalk = require("chalk");
  const betterLogging = require("better-logging");
  // Enables debug output
  console.loglevel = 4;
  // Init betterLogging
  betterLogging(console);
  // Setup middleware
  // const { Theme } = betterLogging;
  app.use(betterLogging.expressMiddleware(console, {
    // color: Theme.green
    color: {
      base: chalk.greenBright,
      type: {
        debug: chalk.magentaBright,
        info: chalk.magentaBright,
        log: chalk.magentaBright,
        error: chalk.blue,
        warn: chalk.blue
      }
    }
  }));

  /**
   * DB init.
   */

  const db = require("./database/db");
  await db.init();

  /**
   * Get port from environment and store in Express.
   */

  const port = normalizePort(process.env.PORT || "8989");
  app.set("port", port);

  /**
   * Create HTTP(s) server.
   */

  let server = null;
  if (process.env.NODE_ENV === "development") {
    server = http.createServer(app);
  } else {
    const options = {
      key: fs.readFileSync(path.join(__dirname, "cert", "server-key.pem")),
      passphrase: fs.readFileSync(path.join(__dirname, "cert", "passphrase")).toString(),
      cert: fs.readFileSync(path.join(__dirname, "cert", "server-cert.pem"))
    };
    server = https.createServer(options, app);
  }

  /**
   * Listen on provided port, on all network interfaces.
   */

  server.listen(port);
  server.on("error", onError);
  server.on("listening", onListening);

  /**
   * Normalize a port into a number, string, or false.
   */

  function normalizePort (val) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
      // named pipe
      return val;
    }

    if (port >= 0) {
      // port number
      return port;
    }

    return false;
  }

  /**
   * Event listener for HTTP server "error" event.
   */

  function onError (error) {
    if (error.syscall !== "listen") {
      throw error;
    }

    const bind = typeof port === "string"
      ? `Pipe ${port}`
      : `Port ${port}`;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case "EACCES":
        console.error(`${bind} requires elevated privileges`);
        break;
      case "EADDRINUSE":
        console.error(`${bind} is already in use`);
        break;
      default:
        throw error;
    }
  }

  /**
   * Event listener for HTTP server "listening" event.
   */

  function onListening () {
    const addr = server.address();
    const bind = typeof addr === "string"
      ? `pipe ${addr}`
      : `port ${addr.port}`;
    console.log(`Listening on ${bind}`);
  }

  /**
   * Socket.IO.
   */

  const io = require("socket.io")(server);

  /**
   * Content Security Policy (CSP).
   */

  // const csp = require("helmet-csp");

  // app.use(csp({
  //   // Specify directives as normal.
  //   directives: {
  //     scriptSrc: ["'self'"],
  //     styleSrc: ["'self'"],
  //     // sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
  //     // reportUri: '/report-violation',
  //     upgradeInsecureRequests: (process.env.NODE_ENV !== 'development'), // true if SSL/TLS is enabled
  //     workerSrc: false  // This is not set.
  //   },
  //
  //   // This module will detect common mistakes in your directives and throw errors
  //   // if it finds any. To disable this, enable "loose mode".
  //   loose: false,
  //
  //   // Set to true if you only want browsers to report errors, not block them.
  //   // You may also set this to a function(req, res) in order to decide dynamically
  //   // whether to use reportOnly mode, e.g., to allow for a dynamic kill switch.
  //   reportOnly: false,
  //
  //   // Set to true if you want to blindly set all headers: Content-Security-Policy,
  //   // X-WebKit-CSP, and X-Content-Security-Policy.
  //   setAllHeaders: false,
  //
  //   // Set to true if you want to disable CSP on Android where it can be buggy.
  //   disableAndroid: false,
  //
  //   // Set to false if you want to completely disable any user-agent sniffing.
  //   // This may make the headers less compatible but it will be much faster.
  //   // This defaults to `true`.
  //   browserSniff: true
  // }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  /**
   * Session middleware with the given options.
   */

  const expressSession = require("express-session");
  const Sequelize = require("sequelize");
  const SequelizeStore = require("connect-session-sequelize")(expressSession.Store);
  const sequelize = new Sequelize("postgres://postgres@localhost/postgres", {
    logging: false
  });

  sequelize.define("session", {
    sid: {
      type: Sequelize.STRING,
      primaryKey: true
    },
    uid: {
      type: Sequelize.INTEGER,
      unique: true
    },
    expires: Sequelize.DATE,
    data: Sequelize.STRING(50000)
  });

  const sessionStore = new SequelizeStore({
    db: sequelize,
    table: "session",
    tableName: "session",
    extendDefaultFields: (defaults, session) => ({
      data: defaults.data,
      expires: defaults.expires,
      uid: session.uid
    })
  });

  const session = expressSession({
    secret: "Top secret! Shh! Don't tell anyone...",
    store: sessionStore,
    signed: true,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1h
      httpOnly: true,
      secure: (process.env.NODE_ENV !== "development") // true if SSL/TLS is enabled
    }
  });

  app.use(session);

  sessionStore.sync();

  /**
   * Share a cookie-based express-session middleware with socket.io.
   */

  const socketIOSession = require("express-socket.io-session");

  io.of("/auth").use(socketIOSession(session, {
    autoSave: true
  }));

  io.of("/api").use(socketIOSession(session, {
    autoSave: true
  }));

  // const syncSession = async (socket, next) => {
  //   const connectSID = socket.handshake.headers.cookie;
  //   [key, value] = decodeURIComponent(connectSID).split('=');
  //   [sessionID, rest] = value.substr(2).split('.');
  //
  //   socket.handshake.sessionStore = sessionStore;
  //   socket.handshake.sessionID = sessionID;
  //
  //   const sessionData = await sessionStore.sessionModel.findAll({
  //     attributes: ["sid", "uid", "data"],
  //     where: { sid: sessionID }
  //   });
  //   sessionData.forEach(async (obj) => {
  //     socket.handshake.session.sessionData = JSON.parse(obj.data);
  //   });
  //
  //   return next();
  // };
  //
  // io.of("/auth").use(syncSession);
  //
  // io.of("/api").use(syncSession);

  const wsController = require("./controllers/wsController");
  wsController.init(io);

  /**
   * Serve client.
   */

  app.use(express.static(path.join(__dirname, "..", "..", "client", "dist")));

  const authController = require("./controllers/authController");
  const authRouter = require("./routes/authRouter");
  const apiRouter = require("./routes/apiRouter");

  app.use("/auth", authRouter);
  app.use("/api", authController.checkIfAuthenticated, apiRouter);

  app.use((req, res) => {
    res.json([{
      status: 404,
      message: "Not Found"
    }]);
  });
})();
