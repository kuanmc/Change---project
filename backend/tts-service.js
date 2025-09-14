// backend/tts-service.js - RELIABLE gTTS VERSION
const GTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

async function generateSpeech(text) {
    try {
        console.log("🎵 Generating audio with gTTS...");
        
        // Create a temporary file path
        const filePath = path.join(__dirname, `temp-audio-${Date.now()}.mp3`);
        
        // Create and save audio - using Promise version
        await new Promise((resolve, reject) => {
            const gtts = new GTTS(text, 'en');
            gtts.save(filePath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Read the file
        const buffer = await readFile(filePath);
        
        // Clean up the temporary file
        await unlink(filePath).catch(err => 
            console.error('Warning: Could not delete temp file:', err));
        
        // Convert to base64
        const audioBase64 = buffer.toString('base64');
        const audioSrc = `data:audio/mp3;base64,${audioBase64}`;
        
        console.log("✅ Audio generated successfully!");
        return audioSrc;

    } catch (error) {
        console.error('❌ TTS Error:', error);
        throw error;
    }
}

module.exports = { generateSpeech };