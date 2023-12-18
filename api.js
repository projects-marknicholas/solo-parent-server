const jsforce = require("jsforce");
require("dotenv").config();
const { SF_LOGIN_URL, SF_USERNAME, SF_PASSWORD, SF_TOKEN } = process.env;

const conn = new jsforce.Connection({
  loginUrl: SF_LOGIN_URL,
});

conn.login(SF_USERNAME, SF_PASSWORD + SF_TOKEN, (err, userInfo) => {
  if (err) {
    console.error(err);
  } else {
    console.log("User ID: " + userInfo.id);
    console.log("Org ID: " + userInfo.organizationId);
  }
});

async function createSoloParentAccount(req, res, next) {
  const { personalInfo, familyComposition } = req.body;
  const fileDataArray = req.files || [];

  async function processFileUploads(conn, soloParentFormId, fileDataArray) {
    if (
      fileDataArray &&
      typeof fileDataArray === "object" &&
      Object.keys(fileDataArray).length > 0
    ) {
      // Map each fileData to a promise that uploads the file
      const fileUploadPromises = Object.keys(fileDataArray).map(
        async (fileType) => {
          const fileData = fileDataArray[fileType];

          // Assuming fileData.data is a Buffer
          const fileObjectData = {
            OwnerId: "0055g00000J9SHLAA3",
            Title: fileData.name,
            PathOnClient: fileData.name,
            VersionData: fileData.data.toString("base64"),
            // ... (other fields specific to this file upload)
          };

          console.log("File Data Array:", fileObjectData);

          try {
            // Upload the file
            const fileUploadResp = await conn
              .sobject("ContentVersion")
              .create(fileObjectData);

            // Check if the file upload failed
            if (!fileUploadResp.success) {
              console.error(
                `Failed to process file upload for ${fileData.name}`
              );
              console.error(fileUploadResp);
              throw new Error("Failed to process file upload");
            }

            console.log(`File ${fileData.name} uploaded successfully`);

            // Retrieve the ContentDocumentId associated with the ContentVersion
            const contentDocumentId = (
              await conn
                .sobject("ContentVersion")
                .retrieve(fileUploadResp.id, ["ContentDocumentId"])
            ).ContentDocumentId;

            // Link the uploaded file to the Solo Parent Application Form
            const contentDocumentLinkResp = await conn
              .sobject("ContentDocumentLink")
              .create({
                ContentDocumentId: contentDocumentId,
                LinkedEntityId: soloParentFormId,
                // ... (other fields specific to ContentDocumentLink)
              });

            // Rest of your code

            // Check if the ContentDocumentLink failed
            if (!contentDocumentLinkResp.success) {
              console.error(
                `Failed to link file to the record for ${fileData.name}`
              );
              console.error(contentDocumentLinkResp);
              // Rollback: Delete the associated ContentVersion and ContentDocumentLink
              await conn.sobject("ContentVersion").destroy(fileUploadResp.id);
              await conn
                .sobject("ContentDocumentLink")
                .destroy(contentDocumentLinkResp.id);
              throw new Error("Failed to link file to the record");
            }

            console.log(
              `File ${fileData.name} linked to the record successfully`
            );
          } catch (error) {
            console.error(`Error processing file ${fileData.name}:`, error);
            throw error; // Re-throw the error to stop further processing
          }
        }
      );

      try {
        // Wait for all file upload operations to complete
        await Promise.all(fileUploadPromises);

        // Continue with the rest of your logic
        // ...

        console.log("File uploads and linking successful");
      } catch (error) {
        // Handle errors during file upload and linking
        console.error("Error during file upload and linking:", error);
        throw new Error("Failed to upload and link files");
      }
    }
  }

  try {
    // Start Basic Information
    // Construct the data for creating a user account
    const userAccountData = {
      Surname__c: personalInfo.surName,
      Given_Name__c: personalInfo.givenName,
      Middle_Name__c: personalInfo.middleName,
      Extension__c: personalInfo.extension,
      Civil_Status__c: personalInfo.civilStatus,
      Sex__c: personalInfo.sex,
      Age__c: personalInfo.age,
      // Date_of_Birth__c: personalInfo.dateOfBirth,
      Email__c: personalInfo.email,
      birthday_string__c: personalInfo.dateOfBirthTwo,
      Place_of_Birth__c: personalInfo.placeOfBirth,
      Religion__c: personalInfo.religion,
      Mobile_Number__c: personalInfo.mobileNumber,
      Identification_Card_Number__c: "00",
      Identification_Card_Type__c: personalInfo.idCardType,
      Landline_Number__c: personalInfo.landlineNumber,
      Present_Address__c: personalInfo.presentAddress,
      Highest_Educational_Attainment__c: personalInfo.educationalAttainment,
      Profession__c: personalInfo.profession,
      Occupation__c: personalInfo.occupation,
      Monthly_Income__c: personalInfo.monthlyIncome,
      Name_of_Employer__c: personalInfo.nameOfEmployer,
      Contact_Number_Employer__c: personalInfo.contactNumberEmployer,
      Employer_Address__c: personalInfo.employerAddress,
      Contact_Person__c: personalInfo.contactPerson,
      Contact_Number_Contact_Person__c: personalInfo.contactNumber,
      // Reasons_Circumstances__c: personalInfo.reasonsCircumstances,
    };

    // const userAccountData = {
    //   Surname__c: "glend",
    //   Identification_Card_Number__c: "00",
    // };

    const userAccountResp = await conn
      .sobject("Solo_Parent_Application_Form__c")
      .create(userAccountData);

    // Check if the user account creation was successful
    if (!userAccountResp.success) {
      req.log.error("Failed to create user account");
      req.log.error(userAccountResp);
      res.status(500).send("Failed to create user account");
      return;
    }

    //end Basic Information

    //call user id for the Relationship between the user, family composition and requirements
    const soloParentFormId = userAccountResp.id;
    const soloParentAccountId = userAccountResp.OwnerId;
    // console.log(familyComposition);
    // // Start Fam Composition
    // const familyMembersData = familyComposition.map((familyMember) => ({
    //   Solo_Parent_Application_Form__c: soloParentFormId, // Use the ID of the master record
    //   Name: familyMember.name,
    //   Age__c: familyMember.age,
    //   Sex__c: familyMember.sex,
    //   Relationship__c: familyMember.relationShip,
    //   Highest_Educational_Attainment__c: familyMember.educationalattainment,
    //   Occupation__c: familyMember.occupation,
    //   Monthly_Income__c: familyMember.monthlyIncome,
    // }));

    // const familyMembersRespArray = await Promise.all(
    //   familyMembersData.map((familyMemberData) =>
    //     conn.sobject("Family_Member__c").create(familyMemberData)
    //   )
    // );

    // // Check if any of the family members failed to be created
    // if (familyMembersRespArray.some((resp) => !resp.success)) {
    //   // Rollback: Delete the user account if family member creation fails
    //   await conn
    //     .sobject("Solo_Parent_Application_Form__c")
    //     .destroy([soloParentFormId]);
    //   res.status(500).send("Failed to add family members");
    //   return;
    // }

    //End Fam Composition

    // Step 3: Process the uploaded PDF files

    // Wait until the form is created, then get the OwnerId
    const soloParentFormDetails = await conn
      .sobject("Solo_Parent_Application_Form__c")
      .retrieve(soloParentFormId, ["OwnerId"]);

    // Trigger the file upload function with the generated OwnerId
    await processFileUploads(conn, soloParentFormId, fileDataArray);
    // ... the rest of your logic

    req.log.info(
      "User account, family composition, and uploaded PDF files created successfully"
    );
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
}

async function readSoloParentDataById(userId) {
  try {
    const query = `SELECT 
      Surname__c, Given_Name__c, Middle_Name__c, Extension__c, Civil_Status__c,
      Sex__c, Age__c, Date_of_Birth__c, birthday_string__c, Place_of_Birth__c, Religion__c,
      Mobile_Number__c, Landline_Number__c, Present_Address__c,
      Highest_Educational_Attainment__c, Profession__c, Occupation__c,
      Monthly_Income__c, Name_of_Employer__c, Contact_Number_Employer__c,
      Employer_Address__c, Contact_Number_Contact_Person__c
      FROM Solo_Parent_Application_Form__c WHERE Id = '${userId}' LIMIT 1`;

    // Execute the query
    const result = await conn.query(query);

    // Check if any records were found
    if (result.totalSize === 0) {
      return null; // No records found
    }

    // Extract the first record
    const record = result.records[0];

    // Return the record as JSON
    return {
      ...record,
    };
  } catch (error) {
    console.error("Error reading data from Salesforce:", error);
    throw error; // Re-throw the error to be handled elsewhere if needed
  }
}

//Display all account
async function readAllSoloParentData() {
  try {
    const query = `SELECT Surname__c, Given_Name__c, Middle_Name__c, Extension__c, Civil_Status__c,
    Sex__c, Age__c, Date_of_Birth__c, Place_of_Birth__c, Religion__c,
    Mobile_Number__c, Landline_Number__c, Present_Address__c,
    Highest_Educational_Attainment__c, Profession__c, Occupation__c,
    Monthly_Income__c, Name_of_Employer__c, Contact_Number_Employer__c,
    Employer_Address__c, Contact_Number_Contact_Person__c FROM Solo_Parent_Application_Form__c LIMIT 10`;

    // Execute the query
    const result = await conn.query(query);

    // Return the records as JSON
    return result.records;
  } catch (error) {
    console.error("Error reading data from Salesforce:", error);
    throw error; // Re-throw the error to be handled elsewhere if needed
  }
}

async function deleteSoloParentData(userId) {
  try {
    // Use the destroy method to delete the record with the specified ID
    const deletedRecords = await conn
      .sobject("Solo_Parent_Application_Form__c")
      .destroy([userId]);

    // Check if the deletion was successful
    if (deletedRecords.length > 0 && deletedRecords[0].success) {
      // Delete associated ContentDocumentLinks and ContentVersions
      const contentDocumentLinks = await conn
        .sobject("ContentDocumentLink")
        .select("ContentDocumentId")
        .where({ LinkedEntityId: userId })
        .execute();

      const contentDocumentIds = contentDocumentLinks.map(
        (link) => link.ContentDocumentId
      );

      await conn.sobject("ContentDocumentLink").destroy(contentDocumentLinks);
      await conn.sobject("ContentVersion").destroy(contentDocumentIds);

      console.log(`Successfully deleted user data with ID: ${userId}`);
      return true; // Deletion was successful
    } else {
      console.error(`Failed to delete user data with ID: ${userId}`);
      return false; // Deletion failed
    }
  } catch (error) {
    console.error("Error deleting user data from Salesforce:", error);
    throw error;
  }
}

async function updateSoloParentData(userId, updatedData) {
  try {
    // Use the update method to update the record with the specified ID
    const updatedRecord = await conn
      .sobject("Solo_Parent_Application_Form__c")
      .update({ Id: userId, ...updatedData });

    // Check if the update was successful
    if (updatedRecord.success) {
      console.log(`Successfully updated user data with ID: ${userId}`);
      return true; // Update was successful
    } else {
      console.error(`Failed to update user data with ID: ${userId}`);
      return false; // Update failed
    }
  } catch (error) {
    console.error("Error updating user data in Salesforce:", error);
    throw error;
  }
}

async function userLogin(req, res) {
  const { username, password } = req.body;

  try {
    // Query Salesforce to find the user with the provided username
    const result = await conn.query(
      `SELECT Id, OwnerId, Solo_Parent_Application__c, Solo_Parent_Application__r.Surname__c, Solo_Parent_Application__r.Given_Name__c,
      Solo_Parent_Application__r.Middle_Name__c, Password__c FROM Account WHERE Name = '${username}' LIMIT 1`
    );    

    if (result.totalSize === 1) {
      // User found, check the provided password
      const user = result.records[0];

      if (user.Password__c != password) {
        // Password is correct, return user information
        res.json({
          success: true,
          message: "Login successful",
          user: {
            id: user.Id,
            userId: user.OwnerId,
            soloParentFormId: user.Solo_Parent_Application__c,
            name:
              user.Solo_Parent_Application__r.Surname__c +
              ", " +
              user.Solo_Parent_Application__r.Given_Name__c +
              " " +
              user.Solo_Parent_Application__r.Middle_Name__c,

            // password: Password__c,

            // Add more user details as needed
          },
        });
      } else {
        // Password is incorrect
        res.status(401).json({
          success: false,
          message: "Incorrect password.",
        });
        res.json(trimmedEnteredPassword);
      }
    } else {
      // User not found or invalid credentials
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

async function fetchUserTickets(userId) {
  try {
    // Query for cases related to the user
    const cases = await conn.query(
      `SELECT CreatedDate, CaseNumber, Type, Status, Description, ContactEmail FROM Case WHERE UserId = '${userId}'`
    );

    return cases.records;
  } catch (error) {
    console.error("Error fetching cases:", error);
    throw error;
  }
}

async function createUserTickets(req, res, next) {
  const { accountId, ownerId, createdDate, ticketType, ticketStatus, ticketSubject, notes, contactId, contactEmail } = req.body;

  try {
    // Create a new case (ticket) for the user
    const newCase = await conn.sobject("Case").create({
      AccountId: accountId,
      OwnerId: ownerId,
      //CreatedDate: createdDate,
      Type: ticketType,
      Status: ticketStatus,
      Subject: ticketSubject,
      Description: notes,
      ContactId: contactId,
      SuppliedEmail: contactEmail,
      Origin: "Web",
    });

    // Respond with the details of the newly created case, including the CaseNumber (ticket ID)
    res.status(201).json({
      //createdDate: newCase.CreatedDate,
      ticketId: newCase.CaseNumber,
      type: newCase.Type,
      status: newCase.Status,
      description: newCase.Description,
      contactEmail: newCase.ContactEmail,
    });
  } catch (error) {
    console.error("Error creating a new ticket:", error);
    res.status(500).json({
      error: "Failed to create a new ticket",
      details: error.message,
      stack: error.stack,
    });
    next(error);
  }
}

async function fetchAllUserTickets(userId) {
  try {
    // Query for cases related to the user
    const cases = await conn.query(
      `SELECT CreatedDate, CaseNumber, Type, Status, Description, SuppliedEmail FROM Case WHERE AccountId	 = '${userId}'`
    );

    return cases.records;
  } catch (error) {
    console.error("Error fetching cases:", error);
    throw error;
  }
}

async function ticketNotif(res, req, next) {
  const { username, applicationNumber } = req.body;

  try {
    // Logic to create or update the custom object record in Salesforce
    // ...

    res
      .status(200)
      .json({ success: true, message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending notification:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to send notification" });
    next(error);
  }
}
// Export the function
module.exports = {
  createSoloParentAccount,
  readSoloParentDataById,
  deleteSoloParentData,
  updateSoloParentData,
  readAllSoloParentData,
  userLogin,
  fetchUserTickets,
  createUserTickets,
  fetchAllUserTickets,
  ticketNotif,
};