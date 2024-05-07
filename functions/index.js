/* eslint-disable padded-blocks, require-jsdoc, no-inner-declarations */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors({origin: true}));

const serviceAccount = require("./permissions.json");
// const { DocumentReference } = require("firebase-admin/firestore");
// const {log} = require("firebase-functions/logger");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();


// Routes
app.get("/hello-world", (req, res) => {
  return res.status(200).send("Hello World!");
});

// Create a subcollection with user name (POST)
const houses = ["Spartans", "Titans", "Sentinels", "Warriors"];

app.post("/api/create/:subcollectionName", (req, res) => {
  (async () => {
    try {
      const randomHouseIndex = Math.floor(Math.random() * houses.length);
      const house = houses[randomHouseIndex];
      const data = {
        house: house,
        levels_score: [],
        total_score: 0,
        current_level: 1,
      };

      const subcollectionName = req.params.subcollectionName;

      await db.collection("users").
          doc(subcollectionName).create(data);

      return res.status(200).send();
    } catch (error) {
      console.log(error);
      return res.status(500).send(error);
    }
  })();
});

// Read(GET) - Read a specifc product based on ID
app.get("/api/read/:id", async (req, res) => {
  try {
    const document = db.collection("test_collection").doc(req.params.id);
    const product = await document.get();
    const response = product.data();

    return res.status(200).send(response);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// Get a specific user's data based on id
app.get("/api/users/:id", async (req, res) => {
  try {
    const document = db.collection("users").doc(req.params.id);
    const user = await document.get();
    const userData = user.data();

    return res.status(200).send(userData);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// Get all public user profile data
// (carefully consider security implications)
app.get("/api/users/", async (req, res) => {
  try {
    const users = [];
    const snapshot = await db.collection("users").get();

    for (const doc of snapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();

      // Optionally add a filter for specific public user fields:
      // const publicUserData = {
      //   name: userData.name,
      //   // Include other public fields as needed
      // };

      users.push({userId, ...userData});
    }

    return res.status(200).send(users);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});
// leader board
app.get("/api/leaderboard", async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();

    // Extract necessary data and sort users based on total score
    const usersData = [];
    snapshot.forEach((doc) => {
      const userData = doc.data();
      usersData.push({userId: doc.id, ...userData});
    });

    // Sort users based on total score in descending order
    const sortedUsers = usersData.sort((a, b) => b.total_score - a.total_score);

    // Extract only necessary fields (username, house, and total score)
    const leaderboardData = sortedUsers.map((user) => ({
      username: user.userId,
      house: user.house,
      total_score: user.total_score,
    }));

    // Wrap leaderboard data inside a "players" array
    const formattedLeaderboard = {players: leaderboardData};

    return res.status(200).send(formattedLeaderboard);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});


// Get a specific lecture's data based on id
app.get("/api/lecture/:id", async (req, res) => {
  try {
    const document = db.collection("lectures").doc(req.params.id);
    const lecture = await document.get();
    const lectureData = lecture.data();

    return res.status(200).send(lectureData);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// Get all quiz data
app.get("/api/quiz/", async (req, res) => {
  try {
    console.log("here");
    const collectionRef = db.collection("Quiz");
    const snapshot = await collectionRef.get();
    const allDocuments = [];

    // Loop through each Quiz document
    for (const doc of snapshot.docs) {
      const quizId = doc.id; // This is the quiz name (e.g., quiz_1, quiz_2)
      const quizData = doc.data();

      const questionsRef = db.collection("Quiz").
          doc(quizId).collection("questions");
      const questionsSnapshot = await questionsRef.get();

      // Extract data and create a new object for each quiz's questions
      const questionsData = questionsSnapshot.docs.map((subDoc) => ({
        id: subDoc.id,
        ...subDoc.data(), // Spread operator to include subDoc data
      }));

      // Combine Quiz data with questions data, including quiz name
      allDocuments.push({quizName: quizId, ...quizData,
        questions: questionsData});
    }

    return res.status(200).send(allDocuments);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

// Get specific quiz data
app.get("/api/quiz/:quizName", async (req, res) => {
  try {
    const quizName = req.params.quizName;
    // Get reference to the Quiz document
    const quizRef = db.collection("Quiz").doc(quizName);
    const quizSnapshot = await quizRef.get();

    // Check if Quiz document exists
    if (!quizSnapshot.exists) {
      return res.status(404).send("Quiz not found");
    }

    const quizData = quizSnapshot.data();

    // Get reference to the "questions" subcollection
    const questionsRef = quizRef.collection("questions");
    const questionsSnapshot = await questionsRef.get();

    // Extract data from each document in the questions subcollection
    const questionsData = questionsSnapshot.docs.map((subDoc) => ({
      id: subDoc.id,
      ...subDoc.data(),
    }));

    // Select 10 random questions
    const randomQuestions = questionsData
        .sort(() => Math.random() - 0.5).slice(0, 10);

    // Combine Quiz data with randomly selected questions
    const response = {quizName, ...quizData, questions: randomQuestions};
    return res.status(200).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});


// add pop up quiz
app.post("/api/quiz/:quizName/questions", async (req, res) => {

  try {
    const quizName = req.params.quizName; // Get quiz name from URL parameter
    const questionData = req.body; // Get question data (should be an array)

    if (!Array.isArray(questionData)) {
      return res.status(400)
          .send("Invalid format Please provide an array of questions.");
    }

    // Get reference to the Quiz document
    const quizRef = db.collection("Quiz").doc(quizName);
    const quizSnapshot = await quizRef.get();

    // Check if Quiz document exists
    if (!quizSnapshot.exists) {
      return res.status(404).send("Quiz not found");
    }

    // Get reference to the "questions" subcollection
    const questionsRef = quizRef.collection("questions");

    // Function to generate the next sequential question ID
    async function getNextQuestionId() {
      let highestQuestionNumber = 0;
      const querySnapshot = await questionsRef.get();
      querySnapshot.forEach((doc) => {
        const idParts = doc.id.split("_");
        const questionNumber = parseInt(idParts[1]);
        highestQuestionNumber = Math.max(highestQuestionNumber, questionNumber);
      });
      return `q_${highestQuestionNumber + 1}`;
    }

    const errors = [];

    // Loop through each question object in the array
    for (const question of questionData) {
      // Validate individual question data
      if (!question.correct_opt || !question.opt_A ||
          !question.opt_B || !question.opt_C ||
           !question.opt_D || !question.text) {
        errors.push("Missing required question data in one or more questions.");
        continue; // Skip to the next iteration if there are errors
      }

      // Generate the next sequential question ID
      const nextQuestionId = await getNextQuestionId();

      // Add the question with the generated ID and question data
      try {
        await questionsRef.doc(nextQuestionId).set(question);
      } catch (error) {
        errors.push("Error adding question to database");
      }
    }

    // Check if there are any errors
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }

    // Return success message after adding all questions
    const response = {message: "Questions added successfully"};
    return res.status(201).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

app.post("/api/normalquiz/:quizName/questions", async (req, res) => {

  try {
    const quizName = req.params.quizName; // Get quiz name from URL parameter
    const questionData = req.body; // Get question data (should be an array)

    if (!Array.isArray(questionData)) {
      return res.status(400)
          .send("Invalid format Please provide an array of questions.");
    }

    // Get reference to the Quiz document
    const quizRef = db.collection("Quiz").doc(quizName);
    const quizSnapshot = await quizRef.get();

    // Check if Quiz document exists
    if (!quizSnapshot.exists) {
      return res.status(404).send("Quiz not found");
    }

    // Get reference to the "questions" subcollection
    const questionsRef = quizRef.collection("questions");

    // Function to generate the next sequential question ID
    async function getNextQuestionId() {
      let highestQuestionNumber = 0;
      const querySnapshot = await questionsRef.get();
      querySnapshot.forEach((doc) => {
        const idParts = doc.id.split("_");
        const questionNumber = parseInt(idParts[1]);
        highestQuestionNumber = Math.max(highestQuestionNumber, questionNumber);
      });
      return `q_${highestQuestionNumber + 1}`;
    }

    const errors = [];

    // Loop through each question object in the array
    for (const question of questionData) {
      // Validate individual question data
      if (!question.correct_opt || !question.opt_A ||
          !question.opt_B || !question.text) {
        errors.push("Missing required question data in one or more questions.");
        continue; // Skip to the next iteration if there are errors
      }

      // Generate the next sequential question ID
      const nextQuestionId = await getNextQuestionId();

      // Add the question with the generated ID and question data
      try {
        await questionsRef.doc(nextQuestionId).set(question);
      } catch (error) {
        errors.push("Error adding question to database");
      }
    }

    // Check if there are any errors
    if (errors.length > 0) {
      return res.status(400).send(errors);
    }

    // Return success message after adding all questions
    const response = {message: "Questions added successfully"};
    return res.status(201).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

// get random popupquiz
app.get("/api/randomquiz/popupquiz", async (req, res) => {
  try {
    // Reference the "popupQuiz" document directly
    const quizRef = db.collection("Quiz")
        .doc("popupQuiz"); // Hardcoded quiz name
    const quizSnapshot = await quizRef.get();

    // Check if Quiz document exists
    if (!quizSnapshot.exists) {
      return res.status(404).send("Quiz not found");
    }

    const quizData = quizSnapshot.data();

    // Reference and retrieve questions from "questions" subcollection
    const questionsRef = quizRef.collection("questions");
    const questionsSnapshot = await questionsRef.get();

    // Extract data from each document
    const questionsData = questionsSnapshot.docs.map((subDoc) => ({
      id: subDoc.id,
      ...subDoc.data(), // Spread operator to include subDoc data
    }));

    // Randomly select and return a single question
    const randomIndex = Math.floor(Math.random() * questionsData.length);
    const selectedQuestion = questionsData[randomIndex];

    // Combine Quiz name with the selected question
    const response = {quizName: "popupQuiz",
      ...quizData, questions: [selectedQuestion]};

    return res.status(200).send(response);
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});


// Update a document (PUT)
app.put("/api/update/:id", async (req, res) => {
  try {
    const documentRef = db.collection("users").doc(req.params.id);
    await documentRef.update(req.body); // Update with data from request body
    return res.status(200).send("Document updated successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

// Delete(Delete)
// Delete a document (DELETE)
app.delete("/api/delete/:id", async (req, res) => {
  try {
    const documentRef = db.collection("test_collection").doc(req.params.id);
    await documentRef.delete();
    return res.status(200).send("Document deleted successfully");
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});


// Get houses total score in descending order
app.get("/api/houses-score", async (req, res) => {
  try {
    // Initialize an empty object to store house data
    const houses = {};

    // Get all users' data
    const snapshot = await db.collection("users").get();

    // Loop through each user document
    snapshot.forEach((doc) => {
      const userData = doc.data();
      const house = userData.house;
      const totalScore = userData.total_score;

      // Check if house exists in the object
      if (!houses[house]) {
        houses[house] = {house, houseScore: 0};
      }

      // Add user's total score to the house's total score
      houses[house].houseScore += totalScore;
    });

    // Convert the houses object to an array and sort by houseScore (descending)
    const housesArray = Object.values(houses).sort((a, b) =>
      b.houseScore - a.houseScore);

    // Return the sorted houses data in the desired format
    return res.status(200).send({houses: housesArray});
  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});

// Export the API to firebase cloud functions
// (calls the function when ever there is a new request)
exports.app = functions.https.onRequest(app);


