DROP TABLE EmergencyRoom CASCADE;
DROP TABLE EmergencyTeam CASCADE;
DROP TABLE Professional CASCADE;
DROP TABLE MedicalIssue CASCADE;
DROP TABLE Priority CASCADE;
DROP TABLE Patient CASCADE;
DROP TABLE Queue CASCADE;
DROP TABLE CompetentToDealWith CASCADE;
DROP TABLE MedicalProcedure CASCADE;
DROP TABLE Drug CASCADE;
DROP TABLE Treatment CASCADE;
DROP TABLE UtilizedProcedure CASCADE;
DROP TABLE ProvidedDrug CASCADE;
DROP TABLE Outcome CASCADE;

DROP FUNCTION updateHadToWait() CASCADE;
DROP TRIGGER UpdatedWaitingTime ON Patient CASCADE;

DROP FUNCTION updateTreatment() CASCADE;
DROP TRIGGER InsertedTreatment ON Patient CASCADE;

DROP FUNCTION updateMedicalProceduresCost() CASCADE;
DROP TRIGGER InsertedUtilizedProcedure ON UtilizedProcedure CASCADE;

DROP FUNCTION updateDrugsCost() CASCADE;
DROP TRIGGER InsertedProvidedDrug ON ProvidedDrug CASCADE;

DROP FUNCTION enqueue() CASCADE;
DROP TRIGGER InsertedPatient ON Patient CASCADE;

DROP FUNCTION updateWaitingTime() CASCADE;
DROP TRIGGER InsertedOrDeletedPatient ON Queue CASCADE;