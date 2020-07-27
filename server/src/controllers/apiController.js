const debug = require("debug")("emergency-room:api");
const dbController = require("./dbController");
const wsController = require("./wsController");

module.exports.getPriorities = async (req, res) => {
  const result = await dbController.getPriorities();
  res.json(result);
};

module.exports.getPriorityID = async (req, res) => {
  const result = await dbController.getPriorityID(req.params.priority);
  res.json(result);
};

module.exports.getPriority = async (req, res) => {
  const result = await dbController.getPriority(req.params.priorityID);
  res.json(result);
};

module.exports.getMedicalIssues = async (req, res) => {
  const result = await dbController.getMedicalIssues();
  res.json(result);
};

module.exports.getMedicalIssueID = async (req, res) => {
  const result = await dbController.getMedicalIssueID(req.params.medicalIssue);
  res.json(result);
};

module.exports.getMedicalIssue = async (req, res) => {
  const result = await dbController.getMedicalIssue(req.params.medicalIssueID);
  res.json(result);
};

module.exports.getDrugs = async (req, res) => {
  const result = await dbController.getDrugs();
  res.json(result);
};

module.exports.getDrugID = async (req, res) => {
  const result = await dbController.getDrugID(req.params.drug);
  res.json(result);
};

module.exports.getDrug = async (req, res) => {
  const result = await dbController.getDrug(req.params.drugID);
  res.json(result);
};

module.exports.getMedicalProcedures = async (req, res) => {
  const result = await dbController.getMedicalProcedures();
  res.json(result);
};

module.exports.getMedicalProcedureID = async (req, res) => {
  const result = await dbController.getMedicalProcedureID(req.params.medicalProcedure);
  res.json(result);
};

module.exports.getMedicalProcedure = async (req, res) => {
  const result = await dbController.getMedicalProcedure(req.params.medicalProcedureID);
  res.json(result);
};

module.exports.getMedicalProceduresFor = async (req, res) => {
  if (req.params.medicalIssue) {
    const result = await dbController.getMedicalIssueID(req.params.medicalIssue);
    if (Array.isArray(result) && result.length === 0) {
      res.json(result);
      return;
    }
    req.params.medicalIssueID = result[0].ID;
  }

  const result = await dbController.getMedicalProceduresFor(req.params.medicalIssueID);
  res.json(result);
};

module.exports.getOutcomes = async (req, res) => {
  const result = await dbController.getOutcomes();
  res.json(result);
};

module.exports.getEmergencyTeams = async (req, res) => {
  const result = await dbController.getEmergencyTeams();
  res.json(result);
};

module.exports.getEmergencyTeamID = async (req, res) => {
  const result = await dbController.getEmergencyTeamID(req.params.emergencyTeam);
  res.json(result);
};

module.exports.getEmergencyTeam = async (req, res) => {
  const result = await dbController.getEmergencyTeam(req.params.emergencyTeamID);
  res.json(result);
};

module.exports.getPatients = async (req, res) => {
  const result = await dbController.getPatients();
  res.json(result);
};

module.exports.getPatientsFor = async (req, res) => {
  if (req.params.emergencyTeam) {
    const result = await dbController.getEmergencyTeamID(req.params.emergencyTeam);
    if (Array.isArray(result) && result.length === 0) {
      res.json(result);
      return;
    }
    req.params.emergencyTeamID = result[0].ID;
  }

  const result = await dbController.getPatientsFor(req.params.emergencyTeamID);
  res.json(result);
};

module.exports.getEmergencyTeamsCompetentToDealWith = async (req, res) => {
  if (req.params.medicalIssue) {
    const result = await dbController.getMedicalIssueID(req.params.medicalIssue);
    if (Array.isArray(result) && result.length === 0) {
      res.json(result);
      return;
    }
    req.params.medicalIssueID = result[0].ID;
  }

  const result = await dbController.getEmergencyTeamsCompetentToDealWith(req.params.medicalIssueID);
  res.json(result);
};

module.exports.enqueuePatient = async (req, res) => {
  try {
    if (req.body.medicalIssue) {
      const result = await dbController.getMedicalIssueID(req.body.medicalIssue);
      req.body.medicalIssueID = result[0].ID;
      if (Array.isArray(result) && result.length === 0) {
        throw Error(`ENQUEUING: medicalIssue ${req.body.medicalIssue} not found`);
      }
    }

    if (req.body.priority) {
      const result = await dbController.getPriorityID(req.body.priority);
      if (Array.isArray(result) && result.length === 0) {
        throw Error(`ENQUEUING: priority ${req.body.priority} not found`);
      }
      req.body.priorityID = result[0].ID;
    }

    if (req.body.emergencyTeam) {
      const result = await dbController.getEmergencyTeamID(req.body.emergencyTeam);
      if (Array.isArray(result) && result.length === 0) {
        throw Error(`ENQUEUING: emergencyTeam ${req.body.emergencyTeam} not found`);
      }
      req.body.emergencyTeamID = result[0].ID;
    }

    const result = await dbController.enqueuePatient(req.body);
    wsController.apiNsp.to(req.body.emergencyTeam).emit("assignment");
    debug("EMIT -> assignment");
    res.json(result);
  } catch (err) {
    console.log(`API error > ${err.toString()}`);
    res.json([]);
  }
};

module.exports.dequeuePatient = async (req, res) => {
  try {
    if (req.body.drugs) {
      req.body.drugsIDs = [];
      for (const drug of req.body.drugs) {
        const result = await dbController.getDrugID(drug);
        if (Array.isArray(result) && result.length === 0) {
          throw Error(`DEQUEUING: drug ${drug} not found`);
        }
        req.body.drugsIDs.push(result[0].ID);
      }
    }

    if (req.body.medicalProcedures) {
      req.body.medicalProceduresIDs = [];
      for (const medicalProcedure of req.body.medicalProcedures) {
        const result = await dbController.getMedicalProcedureID(medicalProcedure);
        if (Array.isArray(result) && result.length === 0) {
          throw Error(`DEQUEUING: medicalProcedure ${medicalProcedure} not found`);
        }
        req.body.medicalProceduresIDs.push(result[0].ID);
      }
    }

    const result = await dbController.dequeuePatient(req.body);
    wsController.apiNsp.to("triageNurse").emit("commitment");
    debug("EMIT -> commitment");
    res.json(result);
  } catch (err) {
    console.log(`API error > ${err.toString()}`);
    res.json([]);
  }
};
