// frontend

// imports react hooks for state management, references, and side effects
import { useState, useRef, useEffect } from 'react';


function App() {

  //randomly picks a brainrot video from public
  const getRandomVideo = () => {
    const videos = ['/video1.mp4', '/video2.mp4', '/video3.mp4'];
    return videos[Math.floor(Math.random() * videos.length)];
  };

  //story video and audio states
  const [story, setStory] = useState(null); // stores story data
  const [audioSrc, setAudioSrc] = useState(null);// path to generated audio 
  const [isLoading, setIsLoading] = useState(false);// loading 
  const [isPlaying, setIsPlaying] = useState(false);//when video/audio is playing
  const [currentVideo, setCurrentVideo] = useState(getRandomVideo());
  
  // social interaction states
  const [currentStoryLikes, setCurrentStoryLikes] = useState(0);
  const [isCurrentStoryLiked, setIsCurrentStoryLiked] = useState(false);
  const [currentStoryComments, setCurrentStoryComments] = useState([]); //current story comments
  const [showCommentInput, setShowCommentInput] = useState(false); //comment text box visibility
  const [newComment, setNewComment] = useState(''); // current comment
  const [showPostModal, setShowPostModal] = useState(false); // the box you can type ur post into
  const [postTitle, setPostTitle] = useState(''); // post title
  const [postContent, setPostContent] = useState(''); // post content
  const [isPosting, setIsPosting] = useState(false);// posting 

  // references
  const videoRef = useRef(null); //reference to background video
  const audioRef = useRef(null); // hidden audio

 

  // Audio and video handlers

  //lets the audio play with the video plays
  const handleAudioPlay = () => {
    videoRef.current?.play();
    setIsPlaying(true);
  };

  //pauses the audio when the video pauses
  const handleAudioPause = () => {
    videoRef.current?.pause();
    setIsPlaying(false);
  };

  //deals with clicking on the video container to play and pause
  const handleVideoClick = () => {
    if (!audioRef.current || !audioSrc) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play().catch(console.error);
  };


  // Like comments and posts

  //fetches comments based on story ID from the backend and if there are comments displays them
  const loadStoryComments = async (storyId) => {
    try {
      const response = await fetch(`http://localhost:462/api/story/${storyId}/comments`);
      if (response.ok) {
        const comments = await response.json();
        setCurrentStoryComments(comments);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  //fetches likes based on storyId from the backend and if there are likes displays them
  //for reddit stories the likes are upvotes 
  const loadStoryLikes = async (storyId) => {
    try {
      const response = await fetch(`http://localhost:462/api/story/${storyId}/likes`);
      if (response.ok) {
        const data = await response.json();
        setCurrentStoryLikes(data.likes);
      }
    } catch (error) {
      console.error('Failed to load likes:', error);
    }
  };

  //handles if the user liked it or not
  const handleLike = async () => {
    if (!story?.id) return;
  
  const action = isCurrentStoryLiked ? 'unlike' : 'like';
  
  try {
    //sends the like to backend and then update the like count and displays on screen if successful
    const response = await fetch(`http://localhost:462/api/story/${story.id}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });

    if (response.ok) {
      const data = await response.json();
      setCurrentStoryLikes(data.likes);
      setIsCurrentStoryLiked(!isCurrentStoryLiked);
    }
  } catch (error) {
    console.error('Failed to update like:', error);
  }
  };

  //handles if the user comments on it or not
  const handleAddComment = async () => {
    if (!newComment.trim() || !story?.id) return;
    
    try {
      //goes to the backend and updates the comment and displays if successful
      const response = await fetch(`http://localhost:462/api/story/${story.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment.trim() })
      });

      if (response.ok) {
        setNewComment('');
        setShowCommentInput(false);
        await loadStoryComments(story.id);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  //handles if the user posts
  const handlePostSubmit = async () => {
    if (!postTitle.trim() || !postContent.trim()) {
      alert('Please fill in both title and content');
      return;
    }

    setIsPosting(true);
    try {
      //go to backend and adding a post
      const response = await fetch('http://localhost:462/api/submit-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: postTitle.trim(),
          content: postContent.trim(),
          subreddit: 'user-submitted',
        })
      });

      if (!response.ok) throw new Error('Failed to submit story');
      
      //if it is added it will show the user that is is added
      alert('Story submitted successfully! It will now be included in the rotation.');
      setShowPostModal(false);
      setPostTitle('');
      setPostContent('');
      
    } catch (error) {
      alert('Error submitting story: ' + error.message);
    } finally {
      setIsPosting(false);
    }
  };

  // reaches to backend to generate audio from text
  const generateAudio = async (text) => {
    try {
      
      const response = await fetch('http://localhost:462/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) throw new Error('Failed to generate audio');
      const audioData = await response.json();
      setAudioSrc(audioData.audioSrc);
      
    } catch (error) {
      
    }
  };

  //fetches the story and its likes and comments from the backend and generates 
  // the audio based on the text
  const fetchRedditStory = async () => {
    setIsLoading(true);
    setStory(null);
    setAudioSrc(null);
    setIsPlaying(false);
    setCurrentStoryLikes(0);
    setIsCurrentStoryLiked(false);
    setCurrentVideo(getRandomVideo());

    try {
      const storyResponse = await fetch('http://localhost:462/api/random-story');
      if (!storyResponse.ok) throw new Error('Failed to fetch story');
      
      const storyData = await storyResponse.json();
      setStory(storyData);

      if (storyData.id) {
        await loadStoryComments(storyData.id);
        await loadStoryLikes(storyData.id);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      await generateAudio(storyData.text);
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };

  // Resets video when new story loads
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  }, [story]);

  // what it displays
  return (

    //black background
    <div style={{ 
      height: '100vh',
      backgroundColor: '#000',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      gap: '30px'
    }}>
      
      {/**video box */}
      <div style={{
        position: 'relative',
        width: 'min(80%, 700px)',
        aspectRatio: '16/9',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        cursor: audioSrc ? 'pointer' : 'default',
        filter: isLoading ? 'brightness(0.5)' : 'brightness(1)',
        transition: 'filter 0.3s ease',
        backgroundColor: '#000' 
      }} onClick={handleVideoClick}>
        
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          key={currentVideo} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        >
          <source src={currentVideo} type="video/mp4" />
        </video>

        {/* loading sign */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            textAlign: 'center',
            zIndex: 10
          }}>
            Loading...
          </div>
        )}

        {/*play pause button*/}
        {audioSrc && !isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '3rem',
            color: 'rgba(255, 255, 255, 0.8)',
            opacity: isPlaying ? 0 : 1,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none'
          }}>
            {isPlaying ? '' : '▶'}
          </div>
        )}
      </div>

      {/* like comment and post buttons*/}
      <div style={{
        width: 'min(80%, 700px)',
        padding: '1rem',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: 'white'
      }}>

        {/* like button*/}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button onClick={handleLike} style={{
            padding: '0.5rem 1rem',
            backgroundColor: isCurrentStoryLiked ? '#ff4444' : '#f0f0f0',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'black'
          }}>
            ❤️ Like ({currentStoryLikes})
          </button>

          {/*comment button */}
          <button onClick={() => setShowCommentInput(!showCommentInput)} style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f0f0f0',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'black'
          }}>
             Comment ({currentStoryComments.length})
          </button>
           
          {/*post button */}
          <button onClick={() => setShowPostModal(true)} style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#7fb3eaff',
            color: 'black',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            Post Story
          </button>
        </div>

        {/*commennt box */}
        {showCommentInput && (
          //the text bos to type comment in
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            <button onClick={handleAddComment} style={{
              // the add button to post the button
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Add
            </button>
          </div>
        )}

        {/*list of comments to show if there are comments */}
        {currentStoryComments.length > 0 && (
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {currentStoryComments.map((comment, index) => (
              <div key={index} style={{ 
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.9rem',
                color: 'white'
              }}>
                {comment}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post texting box */}
      {showPostModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          {/*text at the top  */}
          <div style={{
            backgroundColor: '#1a1a1a',
            padding: '2rem',
            borderRadius: '12px',
            width: 'min(90%, 500px)',
            color: 'white'
          }}>
            <h2 style={{ color: '#ff7f50', marginTop: 0 }}>Post Your Story</h2>
            
            {/*title box*/}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Title:</label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Enter story title..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  backgroundColor: '#2a2a2a',
                  color: 'white'
                }}
              />
            </div>

            {/*story box*/}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Content:</label>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Write your story here..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  minHeight: '120px',
                  backgroundColor: '#2a2a2a',
                  color: 'white'
                }}
              />
            </div>
            
            {/*posting and cancel button*/}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowPostModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handlePostSubmit}
                disabled={isPosting}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: isPosting ? '#666' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isPosting ? 'not-allowed' : 'pointer'
                }}
              >
                {isPosting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio (not shown on screen) */}
      {audioSrc && (
        <audio
          ref={audioRef}
          key={audioSrc}
          onPlay={handleAudioPlay}
          onPause={handleAudioPause}
          onEnded={() => setIsPlaying(false)}
        >
          <source src={audioSrc} type="audio/mp3" />
        </audio>
      )}



      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', width: 'min(90%, 600px)' }}>
       
        {/*next story button*/}
        <button 
          onClick={fetchRedditStory} 
          disabled={isLoading}
          style={{ 
            fontSize: '1.2em', 
            padding: '15px 30px',
            backgroundColor: isLoading ? '#666' : '#ff4757',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(255,71,87,0.3)'
          }}
        >
          {isLoading ? 'Loading...' : 'Next Story'}
        </button>
      </div>
    </div>
  );
}

export default App;