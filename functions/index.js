const functions = require('firebase-functions')
const admin = require('firebase-admin')
const express = require('express')
const cors = require('cors')
const app = express()
app.use(cors({ origin: true }))

var serviceAccount = require('./permissions.json')
const { log } = require('firebase-functions/logger')
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


//Routes
app.get('/hello-world', (req, res) => {
  return res.status(200).send('Hello World!')
});

//Create(POST)
app.post('/api/create', (req, res) => {

  (async () => {
    try {
      await db.collection('test_collection').doc(db.collection('test_collection').doc().id)
        .create({
          name: req.body.name,
          age: req.body.age,
          university: req.body.university
        })

      return res.status(200).send();

    } catch (error) {
      console.log(error);
      return res.status(500).send(error);

    }
  })();
});


//Read(GET) - Read a specifc product based on ID
app.get('/api/read/:id', async (req, res) => {
  try {
    const document = db.collection('test_collection').doc(req.params.id)
    let product = await document.get()
    let response = product.data()

    return res.status(200).send(response)

  } catch (error) {
    console.log(error);
    return res.status(500).send(error)

  }
})


// Get a specific user's data based on id
app.get('/api/users/:id', async (req, res) => {
  try {
    const document = db.collection('users').doc(req.params.id)
    let user = await document.get()
    let user_data = user.data()

    return res.status(200).send(user_data)

  } catch (error) {
    console.log(error);
    return res.status(500).send(error)

  }
});


// Get a specific lecture's data based on id
app.get('/api/lecture/:id', async (req, res) => {
  try {
    const document = db.collection('lectures').doc(req.params.id)
    let lecture = await document.get()
    let lecture_data = lecture.data()

    return res.status(200).send(lecture_data)

  } catch (error) {
    console.log(error);
    return res.status(500).send(error)

  }
});




// Get all quiz data
app.get('/api/quiz/', async (req, res) => {
  try {
    const collectionRef = db.collection('/Quiz/');
    const snapshot = await collectionRef.get();

    const allDocuments = [];
    snapshot.forEach(doc => {
      const documentCollection = doc.collection('questions');
      const documentData = documentCollection.data();
      console.log('documents data: ', documentData);
      documentData.id = doc.id; // Add the document ID to the data
      allDocuments.push(documentData);
    });

    return res.status(200).send(allDocuments);

  } catch (error) {
    console.error(error);
    return res.status(500).send(error);
  }
});


//Update(PUT)


//Delete(Delete)


// Export the API to firebase cloud functions (calls the function when ever there is a new request) 
exports.app = functions.https.onRequest(app)



