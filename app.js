const express = require('express');
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // Import UUID library

dotenv.config();  // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());  // Middleware to parse JSON requests
app.use(cors()); // Enable CORS

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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
