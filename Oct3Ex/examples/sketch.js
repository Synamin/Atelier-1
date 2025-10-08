// ==============================================
// BASIC TOUCH DETECTION EXAMPLE
// ==============================================
// This example shows how to detect when the user
// is touching the screen and display appropriate text
// 
//  CONCEPTS COVERED:
// - Touch detection (touchStarted, touchEnded)
// - Visual feedback based on user interaction
// - Basic p5.js setup and draw functions
// - Mobile gesture locking
// ==============================================

// Variables to store our current state
let isCurrentlyTouching = false;  // Track if screen is being touched
let touchCounter = 0;             // Count how many times screen has been touched
let textColor;                    // Color of the text
let touchStartTime = 0;           // When the current touch started (in milliseconds)
let touchDuration = 0;            // How long the current touch has been active (in seconds)
let flipFail;

let ghostWave;
let ghostSleep;
let ghostWake;
let ghostFallRight;
let ghostFallLeft;

function preload()
{
  flipFail = loadImage('flip1.gif');

  ghostWave = loadImage('ghostWave.gif');
  ghostSleep = loadImage('ghostSleep.gif');
  ghostWake = loadImage('ghostWake.png');
  ghostFallRight = loadImage('ghostRight.gif');
  ghostFallLeft = loadImage('ghostLeft.gif');
}

// ==============================================
// SETUP FUNCTION - Runs once when page loads
// ==============================================
function setup() {
    // Create a canvas that fills the entire screen
    // windowWidth and windowHeight are p5.js variables for screen size
    createCanvas(windowWidth, windowHeight);
    
    // Enable motion sensors with tap permission (iOS)
    enableGyroTap();
   
    // Lock mobile gestures to prevent scrolling, zooming, etc.
    // This function comes from the mobile-p5-permissions library
    lockGestures();

     // Set to show in Degrees
    angleMode(DEGREES);
    
    // Set initial text properties
    textAlign(CENTER, CENTER);  // Center the text horizontally and vertically
    textSize(48);               // Make text large enough to read on mobile
    
    // Set initial colors
    textColor = color(50, 50, 50);  // Dark gray text
}

// ==============================================
// DRAW FUNCTION - Runs continuously (like a loop)
// ==============================================
function draw() 
{
    background(200, 255, 200);
    
    // Tilt threshold (degrees). Adjust to taste.
const tiltThreshold = 40;
// Determine if we should be showing a fall animation
let isFalling = false;
let ry = 0;
if (window.sensorsEnabled && !isCurrentlyTouching) {
    ry = rotationY;
    isFalling = (ry < -tiltThreshold) || (ry > tiltThreshold);
}

if (isCurrentlyTouching) 
{
    touchDuration = (millis() - touchStartTime) / 1000;  // Convert to seconds

    // Show wake image for the first 2 seconds, then switch to wave GIF
    if (touchDuration < 2) {
        image(ghostWake, 0, 0);
    } else {
        image(ghostWave, 0, 0);
    }
} 
else 
{
    // If device is tilted enough, show the appropriate fall GIF.
    if (isFalling) {
        if (ry < -tiltThreshold) {
            image(ghostFallLeft, 0, 0);
        } else {
            image(ghostFallRight, 0, 0);
        }
    } 
    else 
    {
        // Not touching and not falling -> normal sleep image
        image(ghostSleep, 0, 0);
    }
}

// (optional) other non-visual logic / debug can go here
    
}

// ==============================================
// TOUCH EVENT FUNCTIONS
// ==============================================

// This function runs when a touch begins (finger touches screen)
function touchStarted() 
{
    isCurrentlyTouching = true;
    touchCounter = touchCounter + 1;  // Add 1 to our counter each time screen is touched
    touchStartTime = millis();        // Record when this touch started

    return false;
}

// This function runs when a touch ends (finger lifts off screen)
function touchEnded() 
{
    isCurrentlyTouching = false;

    return false;
}

// ==============================================
// MOUSE EVENTS FOR DESKTOP TESTING
// ==============================================
// These functions allow the example to work on desktop too
// for easier testing during development

function mousePressed()
{
    isCurrentlyTouching = true;
    touchCounter = touchCounter + 1;  // Add 1 to counter for desktop testing too
    touchStartTime = millis();        // Record when this touch started

    
}

function mouseReleased() 
{
    isCurrentlyTouching = false;

}

// ==============================================
// WINDOW RESIZE HANDLER
// ==============================================
// This function runs when the screen orientation changes
// or the browser window is resized
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}