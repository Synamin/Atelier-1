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
    
    
    // Clear the screen each frame
    // Change background color based on touch state
    if (isCurrentlyTouching) 
    {
        touchDuration = (millis() - touchStartTime) / 1000;  // Convert to seconds
        /*text("TOUCHED",width/2,height/2);
        
        // Display the touch duration
        textSize(24);
        text("Touch Time: " + touchDuration.toFixed(1) + "s", width/2, height/2 + 60);
        textSize(48);  // Reset to original size
        */
       
        // Show wake image for the first 2 seconds, then switch to wave GIF
        if (touchDuration < 2) {
            image(ghostWake, 0, 0);
        } else {
            image(ghostWave, 0, 0);
        }

    } 
    else 
    {
       // text("NOT TOUCHED",width/2,height/2); 
       image(ghostSleep, 0, 0);
    }
    
    // Show the touch counter at the top of the screen
  /*  textSize(32);  // Smaller text for the counter
    text("Touch Count: " + touchCounter, width/2, 60);
    textSize(48);  // Reset to original size
*/
      // No visual feedback in minimal version
    
    // Check if motion sensors are enabled
    if (window.sensorsEnabled) 
    {
        // Get current orientation values
        let rx = rotationX;
        let ry = rotationY;
        let rz = rotationZ;
        
    // Tilt threshold (degrees). Adjust to taste.
        const tiltThreshold = 40;

        // Only show fall animations when NOT touching (touch should override tilt)
        if (!isCurrentlyTouching) {
            
            if (ry < -tiltThreshold) {
                // Phone rotated left -> show left-fall GIF
                image(ghostFallLeft, 0, 0);
            } else if (ry > tiltThreshold) {
                // Phone rotated right -> show right-fall GIF
                image(ghostFallRight, 0, 0);
            }
        }

    }
    else 
    {
         image(ghostWave, 0, 0);
    }
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