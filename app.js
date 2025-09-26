const express = require('express');
const AWS = require('aws-sdk');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { Resend } = require('resend');
const { v4: uuidv4 } = require('uuid'); // Import UUID library

dotenv.config();  // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());  // Middleware to parse JSON requests
app.use(cors({
  origin: ['https://quiz.rep4finlit.org'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})); // Enable CORS

app.options('*', cors());

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

// Endpoint your frontend will call to submit feedback (No authentication)
app.post('/submit-feedback', async (req, res) => {
  const feedbackData = req.body;

  try {
    // Forward the request to Google Apps Script
    const response = await fetch('https://script.google.com/macros/s/AKfycbwt8T-qa1FrEuQARJNIeWvzIIuL7jmwl96_RUOepNev1EvYaBn98d_8WgLP5v57SzDZAg/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData),
    });

    const result = await response.json();

    // Send back GAS response to frontend
    res.json(result);

  } catch (error) {
    console.error('Error submitting feedback to GAS:', error);
    res.status(500).json({ status: 'error', message: 'Server error submitting feedback' });
  }
});

const resend = new Resend(process.env.RESULTS_RESEND_API_KEY);

app.post('/send-email', async (req, res) => {
  const { emailData } = req.body;
  const imagePath = path.join(__dirname, 'animal_results', emailData.animalResultFile);
  // const polaroidImgSrc = emailData.polaroidAnimalimg.src;
  console.log('Received email:', emailData.input);

  if (!emailData.input) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Send email using Resend
    const response = await resend.emails.send({
      // from: `Rep4finlit Team <onboarding@resend.dev>`, // Must be verified in Resend
      from: `Rep4finlit Team <send@rep4finlit.org>`,
      to: emailData.input,
      subject: 'Your Money Personality Quiz Results!',
      html: `<h3>Hi! Your quiz results are attached below.</h3>`,
      //`<h3>Hi! Here are your Money Personality quiz results:</h3>
      // You are most similar to the ${emailData.mainAnimal}!<br>
      // <img src="/MPQ-Backend/past_armadillo.png" alt="Personality Animal Image" style="width:300px;">,
      // <br>You're percentages for each animal - <br><br>${emailData.allAnimalInfo}`
      // <img src="${polaroidImgSrc}" alt="Personality Animal Image" style="width:300px;"`,

      attachments: [
        {
          filename: emailData.animalResultFile,
          content: fs.readFileSync(imagePath).toString('base64'),
        }
      ]
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
