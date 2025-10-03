let flipFail;
function preload()
{
  flipFail = loadImage('flip1.gif');
}

function setup() 
{
	createCanvas(400, 400);
}

function draw()
{
    background(0);
    image(flipFail,0,0);
}
