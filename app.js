const express = require('express');
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
const fs = require('fs');
const cors = require('cors');
const { Resend } = require('resend');
const { v4: uuidv4 } = require('uuid'); // Import UUID library

dotenv.config();  // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());  // Middleware to parse JSON requests
app.use(cors()); // Enable CORS

// app.get('/', (req, res) => {
//   res.send('Backend is running!');
// });

// AWS configuration
AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: 'us-east-2'
});

const dynamodb = new AWS.DynamoDB.DocumentClient();

// Route to save quiz results
app.post('/save-quiz-result', async (req, res) => {
    const quizResult = req.body; // Get the JSON data sent in the request
    
    // Validate and save the result in DynamoDB
    try {
        await dynamodb.put({
            TableName: 'QuizResults',
            Item: quizResult
        }).promise();

        res.status(200).json({ message: 'Quiz result saved successfully!' });
    } catch (error) {
        console.error('Error saving quiz result:', error);
        res.status(500).json({ error: 'Could not save quiz result' });
    }
});

/// Route to submit feedback (No authentication)
app.post('/submit-feedback', async (req, res) => {
    const feedback = {
        FeedbackID: Date.now().toString(),  // Generate unique feedback ID
        shareHabits: req.body.shareHabits,  // User's willingness to share money habits
        recommendSurvey: req.body.recommendSurvey,  // User's recommendation level
        resultsAccurate: req.body.resultsAccurate,  // Accuracy of results
        resultsHelpful: req.body.resultsHelpful,  // Helpfulness of results
        practicalSteps: req.body.practicalSteps,  // Usefulness of practical steps
        timestamp: new Date().toISOString()  // Add the current timestamp
    };

    // Validate the feedback data
    if (!feedback.shareHabits || !feedback.recommendSurvey || !feedback.resultsAccurate ||
        !feedback.resultsHelpful || !feedback.practicalSteps) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Save feedback to DynamoDB
    try {
        await dynamodb.put({
            TableName: 'Feedback',
            Item: feedback,  // Make sure `feedbackId` is included in the item
        }).promise();

        res.status(200).json({ message: 'Feedback submitted successfully!' });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ error: 'Could not submit feedback' });
    }
});

const resend = new Resend(process.env.RESULTS_RESEND_API_KEY);

app.post('/send-email', async (req, res) => {
  const { emailData } = req.body;
  // const polaroidImgSrc = emailData.polaroidAnimalimg.src;
  console.log('Received email:', emailData.input);

  if (!emailData.input) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Send email using Resend
    const response = await resend.emails.send({
      from: '"Rep4finlit Team" <onboarding@resend.dev>', // Must be verified in Resend
      // from: 'csgzenv@gmail.com',
      to: emailData.input,
      subject: 'Your Money Personality Quiz Results!',
      html: `<h3>Hi! Your quiz results are attached below.</h3>`,
      //`<h3>Hi! Here are your Money Personality quiz results:</h3>
      // You are most similar to the ${emailData.mainAnimal}!<br>
      // <img src="/MPQ-Backend/past_armadillo.png" alt="Personality Animal Image" style="width:300px;">,
      // <br>You're percentages for each animal - <br><br>${emailData.allAnimalInfo}`
      // <img src="${polaroidImgSrc}" alt="Personality Animal Image" style="width:300px;"`,

      // attachments: [
      //   {
      //     filename: 'results.pdf',
      //     content: fs.readFileSync('./resultsExample.pdf').toString('base64'),
      //   }
      // ]
    });

    console.log('Resend response:', response);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }

  // For now, just respond with success to test frontend
  // res.status(200).json({ message: 'Email route works!' });
});

// Start the server
app.listen(PORT, () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Server running on http://localhost:${PORT}`);
    }
});
