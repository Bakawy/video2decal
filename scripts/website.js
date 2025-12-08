//import {mid, convertGifToVideo} from "/helper.js";

const videoUpload = document.getElementById("videoUpload");
const videoUploadLabel = document.getElementById("videoUploadLabel");
const videoDiv = document.getElementById("videoDiv");
const videoPreview = document.getElementById("videoPreview");
const loadFill = document.getElementById("loadFill");
const loader = document.getElementById("loader");
const videoWidth = document.getElementById("videoWidth");
const videoHeight = document.getElementById("videoHeight");

const videoWidthInput = document.getElementById("videoWidthInput");
const videoHeightInput = document.getElementById("videoHeightInput");

let videoFile;

videoUpload.onchange = onVideoUpload;
videoWidthInput.onchange = resizeVideoPreview;
videoHeightInput.onchange = resizeVideoPreview;

let p = 0;
loader.onmousemove = () => {
    p = (p + 0.01) % 1;
    setLoadProgress(p);
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
    const width = parseInt(videoWidthInput.value)
    const height = parseInt(videoHeightInput.value)
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