// server.js

//imports
const express = require('express');// web framework for creating servers and routes
const cors = require('cors'); //connects frontend and backend
const axios = require('axios'); // http requests to fetch reddit stories
require('dotenv').config(); // loads variables from .env file
const { generateSpeech } = require('./tts-service'); //function for tts service


// server creation
const app = express();
const PORT = 462;

const storiesData = {
  userStories: [],
  redditStories: [], 
  storyComments: new Map(), // storyId -> array of comments
  storyLikes: new Map()
};


const userStories = []; //empty array storing stories 

//Helper function gets stories from reddit subreddits and returns them
async function fetchStoriesFromReddit() {
  const subreddits = ['AmItheAsshole', 'tifu', 'TrueOffMyChest'];
  let allPosts = [];


  for (const subreddit of subreddits) {
    console.log(`Fetching posts from r/${subreddit}...`);
    const response = await axios.get(`https://www.reddit.com/r/${subreddit}/top.json?limit=30&t=week`);
    allPosts = allPosts.concat(response.data.data.children);
  }

  const processedStories = allPosts
    .filter(post => post.data.selftext && post.data.selftext.length > 100)
    .map(post => ({
      id: `reddit_${post.data.id}`,
      title: post.data.title,
      text: post.data.selftext
        .replace(/\*\*/g, '')
        .replace(/\n\n/g, ' ')
        .substring(0, 4000),
      subreddit: post.data.subreddit,
      upvotes: post.data.ups,
      isUserSubmitted: false
    }));

  return processedStories;
}


app.use(cors({
    origin: "http://localhost:5173"
}));
app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello! backend working' });
});



//gets story from reddit (3 subreddits), and cleans it up and brings it to the frontend
app.get('/api/reddit-story', async (req, res) => {

  try {
    // use helper method to fetch redditStorries
    const redditStories = await fetchStoriesFromReddit();

    // if no stories found return error
    if (redditStories.length === 0) {
      return res.status(404).json({ error: 'Could not find a good story this time. Try again!' });
    }

    const randomStory = redditStories[Math.floor(Math.random() * redditStories.length)];
    res.json(randomStory); 

  } catch (error) {
    console.error('FULL ERROR:');
    console.error(error); 
    
    // error comes from the Reddit API call
    if (error.response) {
        // The request was made and the server responded with a status code
        console.error('REDDIT API RESPONSE ERROR:');
        console.error('Status Code:', error.response.status);
        console.error('Response Data:', error.response.data);
    } else if (error.request) {
        // The request was made but no response was received
        console.error('NETWORK ERROR: No response received from Reddit.');
        console.error('Request:', error.request);
    } else {
        // Something happened in setting up the request that triggered an Error
        console.error('SETUP ERROR:', error.message);
    }
  }
});


//uses TTS function from tts-server.js to generate audio
app.post('/api/generate-audio', async (req, res) => {
  const { text } = req.body; // Get text from the frontend

  if (!text) {
    return res.status(400).json({ error: 'No text provided to generate audio.' });
  }

  try {
    // Use LOCAL TTS function from tts-service.js
    // limit text length so its not too much
    const audioSrc = await generateSpeech(text);

    res.json({ audioSrc });

  } catch (error) {
    console.error('TTS Generation Error:', error.message);
    res.status(500).json({ error: 'Failed to generate audio: ' + error.message });
  }
});

// deals with the user posting a new story, formatting it and adding it to userStory
app.post('/api/submit-story', (req, res) => {
  try {
    const { title, content, subreddit = 'user-submitted'} = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    //create newStory const and organize all the information
    const newStory = {
      id: Date.now().toString(),
      title: title.trim(),
      text: content.trim(),
      subreddit,
      timestamp: new Date().toISOString(),
      isUserSubmitted: true
    };

    //adds it to the userStories 
    storiesData.userStories.push(newStory);
    storiesData.storyComments.set(newStory.id, []);
    storiesData.storyLikes.set(newStory.id, 0);
    
    res.json({ 
      success: true, 
      message: 'Story posted!',
      story: newStory 
    });

  } catch (error) {
    console.error('Story submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//gets the comments that are stored in the story ids
app.get('/api/story/:id/comments', (req, res) => {
  try {
    const storyId = req.params.id;
    const comments = storiesData.storyComments.get(storyId) || [];
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

//when user post a comment stores it to the story id
app.post('/api/story/:id/comment', (req, res) => {
  try {
    const storyId = req.params.id;
    const { comment } = req.body;
    
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    if (!storiesData.storyComments.has(storyId)) {
      storiesData.storyComments.set(storyId, []);
    }

    const comments = storiesData.storyComments.get(storyId);
    comments.push(comment.trim());
    
    res.json({ success: true, comment: comment.trim() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get likes that are stored in story id
app.get('/api/story/:id/likes', (req, res) => {
  try {
    const storyId = req.params.id;
    const likes = storiesData.storyLikes.get(storyId) || 0;
    res.json({ likes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch likes' });
  }
});

// when the user likes a video store it to the story id
app.post('/api/story/:id/like', (req, res) => {
  try {
    const storyId = req.params.id;
    const { action } = req.body; 
    
    if (!storiesData.storyLikes.has(storyId)) {
      storiesData.storyLikes.set(storyId, 0);
    }

    const currentLikes = storiesData.storyLikes.get(storyId);
    const newLikes = action === 'like' ? currentLikes + 1 : Math.max(0, currentLikes - 1);
    
    storiesData.storyLikes.set(storyId, newLikes);
    
    res.json({ success: true, likes: newLikes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update likes' });
  }
});


//combine the stories and choose
app.get('/api/random-story', async (req, res) => {
  try {
    let allStories = [...userStories]; 

    try {
      const redditStories = await fetchStoriesFromReddit();
      allStories = [...redditStories, ...userStories]; // combine reddit and user stories

      redditStories.forEach(story => {
        if (!storiesData.storyComments.has(story.id)) {
          storiesData.storyComments.set(story.id, []);
        }
        if (!storiesData.storyLikes.has(story.id)) {
          storiesData.storyLikes.set(story.id, story.upvotes || 0);
        }
      });
    } catch (redditError) {
      //if reddit fails just use users
    }

    if (allStories.length === 0) {
      return res.status(404).json({ error: 'No stories available' });
    }

    // select from the combined pool
    const randomStory = allStories[Math.floor(Math.random() * allStories.length)];
    res.json(randomStory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch random story' });
  }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/api/test`);
});