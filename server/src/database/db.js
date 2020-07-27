const util = require("util");
const pg = require("pg");

const config = {
  user: "postgres",
  database: "postgres",
  password: "",
  port: 5432
};

module.exports.client = undefined;

module.exports.init = async () => {
  const client = new pg.Client(config);
  const dbConnect = util.promisify(client.connect).bind(client);
  try {
    module.exports.client = await dbConnect();
    console.log("Database connection status: SUCCESS");
  } catch (e) {
    console.error("Database connection status: FAILURE");
    process.exit(1);
  }
};
