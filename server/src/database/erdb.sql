BEGIN;

CREATE TABLE EmergencyRoom
(
    "ID"     SERIAL      NOT NULL,
    hospital VARCHAR(32) NOT NULL,
    PRIMARY KEY ("ID")
);

CREATE TABLE EmergencyTeam
(
    "ID"              SERIAL      NOT NULL CHECK ("ID" < 6),
    name              VARCHAR(10) NOT NULL,
    "emergencyRoomID" INT         NOT NULL DEFAULT 1,
    PRIMARY KEY ("ID"),
    UNIQUE (name, "emergencyRoomID"),
    FOREIGN KEY ("emergencyRoomID") REFERENCES EmergencyRoom ("ID") ON DELETE CASCADE
);

CREATE TABLE Professional
(
    "ID"              SERIAL      NOT NULL,
    role              VARCHAR(32) NOT NULL,
    username          VARCHAR(32) NOT NULL,
    password          TEXT        NOT NULL,
    "emergencyTeamID" INT,
    PRIMARY KEY ("ID"),
    UNIQUE (username),
    FOREIGN KEY ("emergencyTeamID") REFERENCES EmergencyTeam ("ID") ON DELETE CASCADE
);

CREATE TABLE MedicalIssue
(
    "ID" SERIAL      NOT NULL,
    name VARCHAR(32) NOT NULL,
    PRIMARY KEY ("ID"),
    UNIQUE (name)
);

CREATE TABLE Priority
(
    "ID" SERIAL      NOT NULL CHECK ("ID" < 6),
    name VARCHAR(20) NOT NULL,
    PRIMARY KEY ("ID"),
    UNIQUE (name)
);

CREATE TABLE Patient
(
    "ID"              SERIAL      NOT NULL,
    "firstName"       VARCHAR(32) NOT NULL,
    "lastName"        VARCHAR(32) NOT NULL,
    sex               VARCHAR(1)  NOT NULL,
    age               INT         NOT NULL,
    "priorityID"      INT,
    "emergencyTeamID" INT,
    "emergencyRoomID" INT DEFAULT 1,
    arrival           VARCHAR(32),
    "medicalIssueID"  INT,
    "waitingTime"     INT,
    "hadToWait"       INT DEFAULT 0,
    PRIMARY KEY ("ID"),
    UNIQUE ("firstName", "lastName", sex, age, "priorityID"),
    FOREIGN KEY ("priorityID") REFERENCES Priority ("ID") ON UPDATE CASCADE,
    FOREIGN KEY ("emergencyRoomID") REFERENCES EmergencyRoom ("ID") ON UPDATE CASCADE,
    FOREIGN KEY ("emergencyTeamID") REFERENCES EmergencyTeam ("ID") ON UPDATE CASCADE,
    FOREIGN KEY ("medicalIssueID") REFERENCES MedicalIssue ("ID") ON UPDATE CASCADE
);

CREATE TABLE Queue
(
    "patientID"       INT    NOT NULL,
    place             SERIAL NOT NULL,
    "emergencyTeamID" INT    NOT NULL,
    PRIMARY KEY ("patientID"),
    FOREIGN KEY ("emergencyTeamID") REFERENCES EmergencyTeam ("ID") ON UPDATE CASCADE,
    FOREIGN KEY ("patientID") REFERENCES Patient ("ID") ON DELETE CASCADE
);

CREATE TABLE CompetentToDealWith
(
    "emergencyTeamID" INT NOT NULL,
    "medicalIssueID"  INT NOT NULL,
    FOREIGN KEY ("emergencyTeamID") REFERENCES EmergencyTeam ("ID") ON UPDATE CASCADE,
    FOREIGN KEY ("medicalIssueID") REFERENCES MedicalIssue ("ID") ON UPDATE CASCADE
);

CREATE TABLE MedicalProcedure
(
    "ID"             SERIAL      NOT NULL,
    name             VARCHAR(32) NOT NULL,
    "medicalIssueID" INT         NOT NULL,
    cost             DECIMAL     NOT NULL,
    PRIMARY KEY ("ID"),
    UNIQUE (name, "medicalIssueID"),
    FOREIGN KEY ("medicalIssueID") REFERENCES MedicalIssue ("ID") ON UPDATE CASCADE
);

CREATE TABLE Drug
(
    "ID" SERIAL      NOT NULL,
    name VARCHAR(32) NOT NULL,
    cost DECIMAL     NOT NULL,
    PRIMARY KEY ("ID")
);

CREATE TABLE Treatment
(
    "patientID"       INT NOT NULL,
    "emergencyTeamID" INT NOT NULL,
    cost              DECIMAL DEFAULT 0,
    outcome           VARCHAR(32),
    FOREIGN KEY ("patientID") REFERENCES Patient ("ID") ON DELETE CASCADE,
    FOREIGN KEY ("emergencyTeamID") REFERENCES EmergencyTeam ("ID") ON UPDATE CASCADE
);

CREATE TABLE UtilizedProcedure
(
    "patientID"          INT NOT NULL,
    "medicalProcedureID" INT NOT NULL,
    FOREIGN KEY ("patientID") REFERENCES Patient ("ID") ON DELETE CASCADE,
    FOREIGN KEY ("medicalProcedureID") REFERENCES MedicalProcedure ("ID") ON UPDATE CASCADE
);

CREATE TABLE ProvidedDrug
(
    "patientID" INT NOT NULL,
    "drugID"    INT NOT NULL,
    FOREIGN KEY ("patientID") REFERENCES Patient ("ID") ON DELETE CASCADE,
    FOREIGN KEY ("drugID") REFERENCES Drug ("ID") ON UPDATE CASCADE
);

CREATE TABLE Outcome
(
    "ID" SERIAL      NOT NULL,
    name VARCHAR(32) NOT NULL,
    PRIMARY KEY ("ID"),
    UNIQUE (name)
);

-- Some views
CREATE VIEW PriorityQueue AS
SELECT Queue.place, Patient.*
FROM Patient,
     Queue
WHERE Patient."ID" = Queue."patientID"
ORDER BY Patient."priorityID" DESC, Queue.place;

CREATE VIEW PriorityQueueVerbose AS
SELECT PriorityQueue.*, MedicalIssue.name AS "medicalIssue", Priority.name AS priority, EmergencyTeam.name AS "emergencyTeam"
FROM ((PriorityQueue INNER JOIN MedicalIssue ON MedicalIssue."ID" = PriorityQueue."medicalIssueID")
    INNER JOIN Priority ON Priority."ID" = PriorityQueue."priorityID")
    INNER JOIN EmergencyTeam ON EmergencyTeam."ID" = PriorityQueue."emergencyTeamID";

-- VitalStatistics    
-- 1 BOTH SOME PROCEDURE(s) AND DRUG(s) PROVIDED    
-- 2 NO DRUGS PROVIDED (ONLY PROCEDURE(s))
-- 3 NO PROCEDURES UTILIZED (ONLY DRUG(s))
-- 4 NEITHER PROCEDURE(s) NOR DRUG(s) = MALINGER!!! 
CREATE VIEW VitalStatistics1 AS
SELECT Patient."ID",
       "firstName",
       "lastName",
       sex,
       age,
       MedicalIssue.name     AS "medicalIssue",
       "hadToWait",
       MedicalProcedure.name AS "medicalProcedure",
       Drug.name             AS drug,
       Treatment.cost
FROM (((((Patient INNER JOIN Treatment ON Patient."ID" = Treatment."patientID")
    INNER JOIN UtilizedProcedure ON Patient."ID" = UtilizedProcedure."patientID")
    INNER JOIN ProvidedDrug ON Patient."ID" = ProvidedDrug."patientID")
    INNER JOIN MedicalIssue ON Patient."medicalIssueID" = MedicalIssue."ID")
    INNER JOIN MedicalProcedure ON UtilizedProcedure."medicalProcedureID" = MedicalProcedure."ID")
         INNER JOIN Drug ON ProvidedDrug."drugID" = Drug."ID";

CREATE VIEW VitalStatistics2 AS
SELECT Patient."ID",
       "firstName",
       "lastName",
       sex,
       age,
       MedicalIssue.name     AS "medicalIssue",
       "hadToWait",
       MedicalProcedure.name AS "medicalProcedure",
       Treatment.cost
FROM (((Patient INNER JOIN Treatment ON Patient."ID" = Treatment."patientID")
    INNER JOIN UtilizedProcedure ON Patient."ID" = UtilizedProcedure."patientID")
    INNER JOIN MedicalIssue ON Patient."medicalIssueID" = MedicalIssue."ID")
         INNER JOIN MedicalProcedure ON UtilizedProcedure."medicalProcedureID" = MedicalProcedure."ID";

CREATE VIEW VitalStatistics3 AS
SELECT Patient."ID",
       "firstName",
       "lastName",
       sex,
       age,
       MedicalIssue.name AS "medicalIssue",
       "hadToWait",
       Drug.name         AS "drug",
       Treatment.cost
FROM (((Patient INNER JOIN Treatment ON Patient."ID" = Treatment."patientID")
    INNER JOIN ProvidedDrug ON Patient."ID" = ProvidedDrug."patientID")
    INNER JOIN MedicalIssue ON Patient."medicalIssueID" = MedicalIssue."ID")
         INNER JOIN Drug ON ProvidedDrug."drugID" = Drug."ID";

CREATE VIEW VitalStatistics4 AS
SELECT Patient."ID",
       "firstName",
       "lastName",
       sex,
       age,
       MedicalIssue.name AS "medicalIssue",
       "hadToWait",
       Treatment.cost
FROM (Patient INNER JOIN Treatment ON Patient."ID" = Treatment."patientID")
         INNER JOIN MedicalIssue ON Patient."medicalIssueID" = MedicalIssue."ID";

COMMIT;

BEGIN;

CREATE FUNCTION updateHadToWait() RETURNS TRIGGER AS
$$
DECLARE
    oldTime INT;
    newTime INT;
BEGIN
    SELECT "hadToWait" INTO oldTime FROM Patient WHERE OLD."ID" = NEW."ID";
    SELECT "waitingTime" INTO newTime FROM Patient WHERE OLD."ID" = NEW."ID";
    IF NEW."waitingTime" > NEW."hadToWait" THEN
        UPDATE Patient SET "hadToWait" = NEW."waitingTime" WHERE "ID" = NEW."ID";
    END IF;
    RETURN NEW;
END;
$$
    LANGUAGE 'plpgsql';

CREATE TRIGGER UpdatedWaitingTime
    AFTER UPDATE OF "waitingTime"
    ON Patient
    FOR EACH ROW
EXECUTE PROCEDURE updateHadToWait();

CREATE FUNCTION updateTreatment() RETURNS TRIGGER AS
$$
BEGIN
    INSERT INTO Treatment("patientID", "emergencyTeamID") VALUES (NEW."ID", NEW."emergencyTeamID");
    RETURN NEW;
END;
$$
    LANGUAGE 'plpgsql';

CREATE TRIGGER InsertedTreatment
    AFTER INSERT
    ON Patient
    FOR EACH ROW
EXECUTE PROCEDURE updateTreatment();

CREATE FUNCTION updateMedicalProceduresCost() RETURNS TRIGGER AS
$$
DECLARE
    newCost DECIMAL;
BEGIN
    SELECT cost INTO newCost FROM MedicalProcedure WHERE "ID" = NEW."medicalProcedureID";
    UPDATE Treatment SET cost = cost + newCost WHERE "patientID" = NEW."patientID";
    RETURN NEW;
END;
$$
    LANGUAGE 'plpgsql';

CREATE TRIGGER InsertedUtilizedProcedure
    AFTER INSERT
    ON UtilizedProcedure
    FOR EACH ROW
EXECUTE PROCEDURE updateMedicalProceduresCost();

CREATE FUNCTION updateDrugsCost() RETURNS TRIGGER AS
$$
DECLARE
    newCost DECIMAL;
BEGIN
    SELECT cost INTO newCost FROM Drug WHERE "ID" = NEW."drugID";
    UPDATE Treatment SET cost = cost + newCost WHERE "patientID" = NEW."patientID";
    RETURN NEW;
END;
$$
    LANGUAGE 'plpgsql';

CREATE TRIGGER InsertedProvidedDrug
    AFTER INSERT
    ON ProvidedDrug
    FOR EACH ROW
EXECUTE PROCEDURE updateDrugsCost();

CREATE FUNCTION enqueue() RETURNS TRIGGER AS
$$
BEGIN
    INSERT INTO Queue("patientID", "emergencyTeamID") VALUES (NEW."ID", NEW."emergencyTeamID");
    RETURN NEW;
END;
$$
    LANGUAGE 'plpgsql';

CREATE TRIGGER InsertedPatient
    AFTER INSERT
    ON Patient
    FOR EACH ROW
EXECUTE PROCEDURE enqueue();

CREATE FUNCTION updateWaitingTime() RETURNS TRIGGER AS
$$
DECLARE
    patientTuple    RECORD;
    waitingTime     INT;
BEGIN
    FOR team IN 1..5
        LOOP
            waitingTime := 0;
            FOR patientTuple IN
                SELECT * FROM PriorityQueue WHERE "emergencyTeamID" = team
                LOOP
                    UPDATE Patient SET "waitingTime" = waitingTime WHERE "ID" = patientTuple."ID";
                    waitingTime := waitingTime + 10;
                END LOOP;
        END LOOP;
    RETURN NEW;
END;
$$
    LANGUAGE 'plpgsql';

CREATE TRIGGER InsertedOrDeletedPatient
    AFTER INSERT OR DELETE
    ON Queue
    FOR EACH ROW
EXECUTE PROCEDURE updateWaitingTime();

COMMIT;

BEGIN;

INSERT INTO EmergencyRoom(hospital)
VALUES ('CNH');

INSERT INTO EmergencyTeam(name)
VALUES ('ALPHA');
INSERT INTO EmergencyTeam(name)
VALUES ('BETA');
INSERT INTO EmergencyTeam(name)
VALUES ('GAMMA');
INSERT INTO EmergencyTeam(name)
VALUES ('DELTA');
INSERT INTO EmergencyTeam(name)
VALUES ('EPSILON');

INSERT INTO Professional(role, username, password)
VALUES ('triageNurse', 'TNUR', '$2b$11$Nw/42Q82bOvLynrU5IzeSuBSz/hnWaedx85h3q8YXXfDfD8IQfW0O');
INSERT INTO Professional(role, username, password, "emergencyTeamID")
VALUES ('physicianTeam', 'ALPHA', '$2b$11$Nw/42Q82bOvLynrU5IzeSuBSz/hnWaedx85h3q8YXXfDfD8IQfW0O', 1);
INSERT INTO Professional(role, username, password, "emergencyTeamID")
VALUES ('physicianTeam', 'BETA', '$2b$11$Nw/42Q82bOvLynrU5IzeSuBSz/hnWaedx85h3q8YXXfDfD8IQfW0O', 2);
INSERT INTO Professional(role, username, password, "emergencyTeamID")
VALUES ('physicianTeam', 'GAMMA', '$2b$11$Nw/42Q82bOvLynrU5IzeSuBSz/hnWaedx85h3q8YXXfDfD8IQfW0O', 3);
INSERT INTO Professional(role, username, password, "emergencyTeamID")
VALUES ('physicianTeam', 'DELTA', '$2b$11$Nw/42Q82bOvLynrU5IzeSuBSz/hnWaedx85h3q8YXXfDfD8IQfW0O', 4);
INSERT INTO Professional(role, username, password, "emergencyTeamID")
VALUES ('physicianTeam', 'EPSILON', '$2b$11$Nw/42Q82bOvLynrU5IzeSuBSz/hnWaedx85h3q8YXXfDfD8IQfW0O', 5);

INSERT INTO MedicalIssue(name)
VALUES ('headaches');
INSERT INTO MedicalIssue(name)
VALUES ('foreign objects in the body');
INSERT INTO MedicalIssue(name)
VALUES ('skin infections');
INSERT INTO MedicalIssue(name)
VALUES ('back pain');
INSERT INTO MedicalIssue(name)
VALUES ('cuts and contusions');
INSERT INTO MedicalIssue(name)
VALUES ('upper respiratory infections');
INSERT INTO MedicalIssue(name)
VALUES ('sprains and broken bones');
INSERT INTO MedicalIssue(name)
VALUES ('toothaches');
INSERT INTO MedicalIssue(name)
VALUES ('abdominal pain');
INSERT INTO MedicalIssue(name)
VALUES ('chest pains');

INSERT INTO Priority(name)
VALUES ('SATISFACTORY');
INSERT INTO Priority(name)
VALUES ('GUARDED');
INSERT INTO Priority(name)
VALUES ('SERIOUS');
INSERT INTO Priority(name)
VALUES ('CRITICAL');
INSERT INTO Priority(name)
VALUES ('GRAVE');

INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Randle', 'McMurphy', 'M', 38, 'independently', 5, 1, 1);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Chief', 'Bromden', 'M', 42, 'by ambulance', 5, 2, 3);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Mildred', 'Ratched', 'F', 41, 'independently', 5, 3, 4);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Billy', 'Bibbit', 'M', 25, 'by ambulance', 4, 4, 1);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Dale', 'Harding', 'M', 62, 'by ambulance', 4, 5, 6);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('George', 'Sorensen', 'M', 58, 'independently', 3, 2, 6);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Charlie', 'Cheswick', 'M', 61, 'by ambulance', 4, 1, 2);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Martini', 'Martini', 'M', 34, 'independently', 3, 3, 9);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Scanlon', 'Scanlon', 'M', 41, 'independently', 2, 4, 5);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Max', 'Taber', 'M', 29, 'independently', 4, 5, 9);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Jim', 'Sefelt', 'M', 72, 'by ambulance', 2, 1, 8);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Bruce', 'Fredrickson', 'M', 59, 'independently', 2, 5, 10);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Pete', 'Bancini', 'M', 74, 'independently', 1, 1, 1);
INSERT INTO Patient("firstName", "lastName", sex, age, arrival, "priorityID", "emergencyTeamID", "medicalIssueID")
VALUES ('Colonel', 'Matterson', 'M', 88, 'by ambulance', 1, 1, 2);

INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (1, 1);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (1, 2);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (1, 8);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (2, 3);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (2, 6);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (2, 9);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (3, 4);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (3, 9);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (3, 10);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (4, 1);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (4, 5);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (4, 7);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (5, 6);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (5, 9);
INSERT INTO CompetentToDealWith("emergencyTeamID", "medicalIssueID")
VALUES (5, 10);

INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Ventriculostomy', 1, 550);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Laryngoscopy', 1, 780);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Computed tomography', 1, 560);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Ultrasonography', 2, 880);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Gastric lavage', 2, 780);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Paracentesis', 2, 210);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Escharotomy', 3, 470);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Drainage', 3, 930);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Incision', 3, 670);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Lumbar puncture', 4, 110);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Magnetic resonance imaging', 4, 430);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Arthrocentesis', 4, 230);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Biopsy', 5, 340);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Blood transfusion', 5, 540);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('EEG electroencephalogram', 5, 340);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Allergy shots', 6, 340);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Acupuncture', 6, 980);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Keratectomy', 6, 470);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Transfusion', 7, 460);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Echocardiogram', 7, 540);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Duodenoscopy', 7, 340);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('X-rays', 8, 100);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Colonoscopy', 8, 900);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Wound closure', 8, 80);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Gastroscopy', 9, 500);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Bypass', 9, 400);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Appendectomy', 9, 300);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Vasectomy', 10, 200);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Tracheostomy', 10, 100);
INSERT INTO MedicalProcedure(name, "medicalIssueID", cost)
VALUES ('Dialysis', 10, 400);

INSERT INTO Drug(name, cost)
VALUES ('Hydrocortisone sodium', 5);
INSERT INTO Drug(name, cost)
VALUES ('Adrenaline', 53);
INSERT INTO Drug(name, cost)
VALUES ('Chlorphenamine', 21);
INSERT INTO Drug(name, cost)
VALUES ('Paracetamol', 14);
INSERT INTO Drug(name, cost)
VALUES ('Dihydrocodeine', 33);
INSERT INTO Drug(name, cost)
VALUES ('Cyclimorph', 23);
INSERT INTO Drug(name, cost)
VALUES ('Diclofenac', 26);
INSERT INTO Drug(name, cost)
VALUES ('Naloxone', 19);
INSERT INTO Drug(name, cost)
VALUES ('Amoxicillin', 16);
INSERT INTO Drug(name, cost)
VALUES ('Penicillin', 20);
INSERT INTO Drug(name, cost)
VALUES ('Aspirin', 13);
INSERT INTO Drug(name, cost)
VALUES ('Atropine', 23);
INSERT INTO Drug(name, cost)
VALUES ('Diazepam', 48);
INSERT INTO Drug(name, cost)
VALUES ('Chlorpromazine', 24);
INSERT INTO Drug(name, cost)
VALUES ('Dopamine', 80);

INSERT INTO Outcome(name)
VALUES ('COMMITTED');
INSERT INTO Outcome(name)
VALUES ('RELEASED');

COMMIT;