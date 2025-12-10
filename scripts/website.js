//import {mid, convertGifToVideo} from "/helper.js";

const videoUpload = document.getElementById("videoUpload");
const videoUploadLabel = document.getElementById("videoUploadLabel");
const videoDiv = document.getElementById("videoDiv");
const videoPreview = document.getElementById("videoPreview");
const loadFill = document.getElementById("loadFill");
const loader = document.getElementById("loader");
const videoWidth = document.getElementById("videoWidth");
const videoHeight = document.getElementById("videoHeight");
const frameRateCanvas = document.getElementById("frameRateCanvas");
const videoOptionsDiv = document.getElementById("videoOptionsDiv");

const videoWidthInput = document.getElementById("videoWidthInput");
const videoHeightInput = document.getElementById("videoHeightInput");
const frameRateInput = document.getElementById("frameRateInput");
const jpgQuality = document.getElementById("jpgQuality");//slider
const jpgQualityValue = document.getElementById("jpgQualityValue");

let videoFile;
let frameRate = 30;

videoUpload.onchange = onVideoUpload;
videoWidthInput.onchange = resizeVideoPreview;
videoHeightInput.onchange = resizeVideoPreview;
frameRateInput.onchange = function(e) {
    frameRate = Math.max(e.target.value, 1);
} 
jpgQuality.oninput = function(e) {
    jpgQualityValue.value = e.target.value
}
jpgQualityValue.onchange = function(e) {
    jpgQuality.value = e.target.value;
}

function validateVideo(event) {
    const file = event.target.files[0];
    if (!file) return false;

    const fileName = file.name;
    const validTypes = ["mp4", "gif", "webm", "mov"];
    let correctType = false
    for (i=0; i < validTypes.length; i++) {
        if (fileName.endsWith(validTypes[i])) {
            correctType = true;
            break;
        }
    }
    if (!correctType) return "Incorrect file type \n mp4 gif webm mov";
    return true
}

function resizeVideoPreview() {
    const width = Math.max(parseInt(videoWidthInput.value), 1)
    const height = Math.max(parseInt(videoHeightInput.value), 1)
    console.log(`${width} vs ${height}`)
    if (width > height) {
        console.log("width maxxing")
        videoDiv.style.width = "70vmin";
        videoDiv.style.height = `${70 * (height/width)}vmin`;
    } else {
        console.log("height maxxing")
        videoDiv.style.height = "70vmin";
        videoDiv.style.width = `${70 * (width/height)}vmin`;
    }
}

async function onVideoUpload(event) {
    const validVideo = validateVideo(event)
    if (validVideo !== true) {
        if (validVideo) alert(validVideo);
        return;
    }

    let file = event.target.files[0];
    if (file.name.endsWith("gif")) {
        file = await convertGifToVideo(file);
    }

    videoFile = file;
    console.log(videoFile)
    videoPreview.src = URL.createObjectURL(videoFile);
    videoPreview.onloadeddata = () => {
        toVideoEditor();
    };
}

function toVideoEditor() {
    //alert("ran");

    console.log(videoPreview.getVideoPlaybackQuality().totalVideoFrames)

    const anim = videoUploadLabel.animate([
        {transform: 'scale(1)'},
        {transform: 'scale(0)'},
    ],{
        duration: 500,
        iterations: 1,
        easing: "ease-in",
    });
    anim.onfinish = function() {
        videoUploadLabel.style.display = "none";
        
        videoDiv.style.display = "block";
        videoOptionsDiv.style.display = "block";
        videoWidthInput.value = videoPreview.videoWidth
        videoHeightInput.value = videoPreview.videoHeight
        resizeVideoPreview()
        
        /*
        const videoRect = videoPreview.getBoundingClientRect();
        videoWidth.style.width = `${videoRect.width}px`;
        videoWidth.style.height = `${videoRect.height/5}px`;
        //videoWidth.style.bottom = `${videoRect.top}px`;
        //console.log(`${videoWidth.style.width} = ${videoPreview.clientWidth}`);
        */
        
        const anim2 = videoDiv.animate([
            {transform: 'scale(0)'},
            {transform: 'scale(1)'},
        ],{
            duration: 500,
            iterations: 1,
            easing: "ease-out",
        });
        
        anim2.onfinish = function() {
            videoWidth.style.display = "block";
            videoHeight.style.display = "block";

            videoWidth.animate([
                {transform: 'translateY(100%)'},
                {transform: 'translateY(0%)'},
            ],{
                duration: 400,
                iterations: 1,
                easing: "ease-out",
            })
            videoHeight.animate([
                {transform: 'translateX(-100%)'},
                {transform: 'translateX(0%)'},
            ],{
                duration: 400,
                iterations: 1,
                easing: "ease-out",
            })
        }

        
        videoOptionsDiv.animate([
            {transform: 'translateX(-100%)'},
            {transform: 'translateX(0%)'},
        ],{
            duration: 500,
            iterations: 1,
            easing: "ease-out",
        });
        
    };
}

function setLoadProgress(percent) {
    let difference = Math.abs(percent - loadFill.style.getPropertyValue("--fill"));
    percent = mid(0, percent, 1);
    loadFill.style.setProperty('--fill', percent);
    loadFill.style.setProperty('transition', `--fill ${difference * 4}s linear`);
}

function hideLoadProgress() {
    setLoadProgress(0);
    loader.style.display = "none";
}

function showLoadProgress() {
    loader.style.display = "block";
}

const frctx = frameRateCanvas.getContext('2d');

function animateFrameRate() {
    setTimeout(animateFrameRate, 1000 / frameRate);
    if (frameRateCanvas.style.display == "none") return;
    const width = frameRateCanvas.width
    const height = frameRateCanvas.height

    frctx.clearRect(0, 0, width, height);
    frctx.fillStyle = "#ff0000";
    //frctx.strokeStyle = "red";
    //frctx.strokeRect(0, 0, width, height);
    frctx.fillStyle = "#ffffff";

    const pi2 = 2 * Math.PI
    const period = 2;
    const time = ((Date.now() / 1000) % period) / period;
    const r = 0.0007 * width * height
    let x = width/2 + (width/2 - r) * Math.cos(time * pi2);
    let y = height/2 + (height/2 - r) * Math.sin(time * 2 * pi2);

    frctx.beginPath()
    frctx.arc(x, y, r, 0, 2 * Math.PI);
    frctx.fill();
}
animateFrameRate();
