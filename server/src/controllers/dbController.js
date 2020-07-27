const db = require("../database/db");
const pdfController = require("./pdfController");

// prepared statements to prevent SQL injections
const sql = {
  text: "",
  values: []
};

const query = async (sql) => {
  try {
    const result = await db.client.query(sql);
    return result.rows;
  } catch (err) {
    console.log(`DB error > ${err.toString()}`);
    throw err;
  }
};

module.exports.getProfessional = async (username) => {
  sql.text = "SELECT * FROM Professional WHERE username = $1";
  sql.values = [username];
  return await query(sql);
};

module.exports.getPriorities = async () => {
  sql.text = "SELECT * FROM Priority";
  sql.values = [];
  return await query(sql);
};

module.exports.getPriorityID = async (priority) => {
  sql.text = "SELECT \"ID\" FROM Priority WHERE name = $1";
  sql.values = [priority];
  return await query(sql);
};

module.exports.getPriority = async (priorityID) => {
  sql.text = "SELECT name FROM Priority WHERE \"ID\" = $1";
  sql.values = [priorityID];
  return await query(sql);
};

module.exports.getMedicalIssues = async () => {
  sql.text = "SELECT * FROM MedicalIssue ORDER BY name";
  sql.values = [];
  return await query(sql);
};

module.exports.getMedicalIssueID = async (medicalIssue) => {
  sql.text = "SELECT \"ID\" FROM MedicalIssue WHERE name = $1";
  sql.values = [medicalIssue];
  return await query(sql);
};

module.exports.getMedicalIssue = async (medicalIssueID) => {
  sql.text = "SELECT name FROM MedicalIssue WHERE \"ID\" = $1";
  sql.values = [medicalIssueID];
  return await query(sql);
};

module.exports.getDrugs = async () => {
  sql.text = "SELECT * FROM Drug ORDER BY name";
  sql.values = [];
  return await query(sql);
};

module.exports.getDrugID = async (drug) => {
  sql.text = "SELECT \"ID\" FROM Drug WHERE name = $1";
  sql.values = [drug];
  return await query(sql);
};

module.exports.getDrug = async (drugID) => {
  sql.text = "SELECT name FROM Drug WHERE \"ID\" = $1";
  sql.values = [drugID];
  return await query(sql);
};

module.exports.getMedicalProcedures = async () => {
  sql.text = "SELECT * FROM MedicalProcedure ORDER BY name";
  sql.values = [];
  return await query(sql);
};

module.exports.getMedicalProcedureID = async (medicalProcedure) => {
  sql.text = "SELECT \"ID\" FROM MedicalProcedure WHERE name = $1";
  sql.values = [medicalProcedure];
  return await query(sql);
};

module.exports.getMedicalProcedure = async (medicalProcedureID) => {
  sql.text = "SELECT name FROM MedicalProcedure WHERE \"ID\" = $1";
  sql.values = [medicalProcedureID];
  return await query(sql);
};

module.exports.getMedicalProceduresFor = async (medicalIssueID) => {
  sql.text = "SELECT * FROM MedicalProcedure WHERE \"medicalIssueID\" = $1 ORDER BY name";
  sql.values = [medicalIssueID];
  return await query(sql);
};

module.exports.getOutcomes = async () => {
  sql.text = "SELECT * FROM Outcome";
  sql.values = [];
  return await query(sql);
};

module.exports.getEmergencyTeams = async () => {
  sql.text = "SELECT * FROM EmergencyTeam";
  sql.values = [];
  return await query(sql);
};

module.exports.getEmergencyTeamID = async (emergencyTeam) => {
  sql.text = "SELECT \"ID\" FROM EmergencyTeam WHERE name = $1";
  sql.values = [emergencyTeam];
  return await query(sql);
};

module.exports.getEmergencyTeam = async (emergencyTeamID) => {
  sql.text = "SELECT name FROM EmergencyTeam WHERE \"ID\" = $1";
  sql.values = [emergencyTeamID];
  return await query(sql);
};

module.exports.getPatients = async () => {
  sql.text = "SELECT * FROM PriorityQueueVerbose";
  sql.values = [];
  return await query(sql);
};

module.exports.getPatientsFor = async (emergencyTeamID) => {
  sql.text = "SELECT * FROM PriorityQueueVerbose WHERE \"emergencyTeamID\" = $1";
  sql.values = [emergencyTeamID];
  return await query(sql);
};

module.exports.getEmergencyTeamsCompetentToDealWith = async (medicalIssueID) => {
  sql.text = "SELECT EmergencyTeam.* FROM EmergencyTeam INNER JOIN CompetentToDealWith ON EmergencyTeam.\"ID\" = CompetentToDealWith.\"emergencyTeamID\" WHERE \"medicalIssueID\" = $1";
  sql.values = [medicalIssueID];
  return await query(sql);
};

module.exports.enqueuePatient = async ({
  firstName, lastName, sex, age, priorityID, emergencyTeamID, medicalIssueID
}) => {
  sql.text = "INSERT INTO Patient(\"firstName\", \"lastName\", sex, age, \"priorityID\", \"emergencyTeamID\", \"medicalIssueID\") VALUES ($1, $2, $3, $4, $5, $6, $7)";
  sql.values = [firstName, lastName, sex, age, priorityID, emergencyTeamID, medicalIssueID];
  return await query(sql);
};

module.exports.dequeuePatient = async ({
  ID, drugs, drugsIDs, medicalProcedures, medicalProceduresIDs, outcome
}) => {
  try {
    sql.text = "BEGIN";
    sql.values = [];
    await query(sql);

    sql.text = "SET TRANSACTION ISOLATION LEVEL Serializable";
    sql.values = [];
    await query(sql);

    sql.text = "UPDATE Treatment SET outcome = $1 WHERE \"patientID\" = $2";
    sql.values = [outcome, ID];
    await query(sql);

    for (const medicalProcedureID of medicalProceduresIDs) {
      sql.text = "INSERT INTO UtilizedProcedure(\"patientID\", \"medicalProcedureID\") SELECT $1, $2 WHERE EXISTS " +
                "(SELECT * FROM PriorityQueue INNER JOIN MedicalProcedure " +
                "ON PriorityQueue.\"medicalIssueID\" = MedicalProcedure.\"medicalIssueID\" " +
                "WHERE PriorityQueue.\"ID\" = $1 AND MedicalProcedure.\"ID\" = $2)";
      sql.values = [ID, medicalProcedureID];
      await query(sql);
      // TODO check if any row has been inserted, if not - ROLLBACK
    }

    for (const drugID of drugsIDs) {
      sql.text = "INSERT INTO ProvidedDrug(\"patientID\", \"drugID\") VALUES($1, $2)";
      sql.values = [ID, drugID];
      await query(sql);
    }

    sql.text = "SELECT DISTINCT \"firstName\", \"lastName\", sex, age, \"medicalIssue\", \"hadToWait\", cost FROM VitalStatistics1 WHERE \"ID\" = $1";
    sql.values = [ID];
    pdfController.createReport((await query(sql))[0], drugs, medicalProcedures, outcome);

    sql.text = "DELETE FROM Patient WHERE \"ID\" = $1";
    sql.values = [ID];
    await query(sql);

    sql.text = "COMMIT";
    sql.values = [];
    return await query(sql);
  } catch (err) {
    console.log(`DB error (ROLLBACK) > ${err.toString()}`);
    return await query("ROLLBACK");
  }
};
