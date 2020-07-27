const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");
const apiController = require("../controllers/apiController");

router.get("/priorities", apiController.getPriorities)
  .get("/priorities/:priorityID(\\d+)", apiController.getPriority)
  .get("/priorities/:priority", apiController.getPriorityID);

router.get("/medical-issues", apiController.getMedicalIssues)
  .get("/medical-issues/:medicalIssueID(\\d+)", apiController.getMedicalIssue)
  .get("/medical-issues/:medicalIssue", apiController.getMedicalIssueID);

router.get("/drugs", apiController.getDrugs)
  .get("/drugs/:drugID(\\d+)", apiController.getDrug)
  .get("/drugs/:drug", apiController.getDrugID);

router.get("/medical-procedures", apiController.getMedicalProcedures)
  .get("/medical-procedures/:medicalProcedureID(\\d+)", apiController.getMedicalProcedure)
  .get("/medical-procedures/:medicalProcedure", apiController.getMedicalProcedureID)
  .get("/medical-procedures/for/:medicalIssueID(\\d+)", apiController.getMedicalProceduresFor)
  .get("/medical-procedures/for/:medicalIssue", apiController.getMedicalProceduresFor);

router.get("/outcomes", apiController.getOutcomes);

router.get("/emergency-teams", apiController.getEmergencyTeams)
  .get("/emergency-teams/:emergencyTeamID(\\d+)", apiController.getEmergencyTeam)
  .get("/emergency-teams/:emergencyTeam", apiController.getEmergencyTeamID)
  .get("/emergency-teams/:emergencyTeamID(\\d+)/patients", apiController.getPatientsFor)
  .get("/emergency-teams/:emergencyTeam/patients", apiController.getPatientsFor)
  .get("/emergency-teams/competent-to-deal-with/:medicalIssueID(\\d+)", apiController.getEmergencyTeamsCompetentToDealWith)
  .get("/emergency-teams/competent-to-deal-with/:medicalIssue", apiController.getEmergencyTeamsCompetentToDealWith);

router.get("/patients", apiController.getPatients)
  .post("/patients", authController.checkIfAuthorizedAsTriageNurse, apiController.enqueuePatient)
  .delete("/patients/:patientID(\\d+)", authController.checkIfAuthorizedAsPhysicianTeam, apiController.dequeuePatient);

module.exports = router;
