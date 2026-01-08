//import {mid, convertGifToVideo} from "/helper.js";

const videoUploadLabel = document.getElementById("videoUploadLabel");
const videoDiv = document.getElementById("videoDiv");
const videoPreview = document.getElementById("videoPreview");
const loadFill = document.getElementById("loadFill");
const loader = document.getElementById("loader");
const videoWidth = document.getElementById("videoWidth");
const videoHeight = document.getElementById("videoHeight");
const frameRateCanvas = document.getElementById("frameRateCanvas");
const videoOptionsDiv = document.getElementById("videoOptionsDiv");
const frameReuseDiv = document.getElementById("frameReuseDiv");
const compareLeft = document.getElementById("compareLeft");
const compareRight = document.getElementById("compareRight");
const compareLeftFrame = document.getElementById("compareLeftFrame");
const compareRightFrame = document.getElementById("compareRightFrame");
const frameReuseTestResult = document.getElementById("frameReuseTestResult");
const toDecalEditorLabel = document.getElementById("toDecalEditorLabel");
const riqInputLabel = document.getElementById("riqInputLabel");
const editorOptionsDiv = document.getElementById("editorOptionsDiv");
const riqOptions = document.getElementById("riqOptions");
const generateRiqLabel = document.getElementById("generateRiqLabel");
const riqOutput = document.getElementById("riqOutput");

const videoUpload = document.getElementById("videoUpload");
const videoWidthInput = document.getElementById("videoWidthInput");
const videoHeightInput = document.getElementById("videoHeightInput");
const frameRateInput = document.getElementById("frameRateInput");
const jpgQuality = document.getElementById("jpgQuality");//slider
const jpgQualityValue = document.getElementById("jpgQualityValue");
const differenceThreshold = document.getElementById("differenceThreshold");
const checkAllFramesInput = document.getElementById("checkAllFramesInput");
const isPNG = document.getElementById("png");
const checkLastInput = document.getElementById("checkLastInput");
const riqInput = document.getElementById("riqInput");
const trackInput = document.getElementById("trackInput");
const beatInput = document.getElementById("beatInput");
const lengthInput = document.getElementById("lengthInput");
const fileNameInput = document.getElementById("fileNameInput");
const overrideLength = document.getElementById("overrideLength");

let mediaInfo;
let videoFile;
let frameRate = 30;
let videoFrameRate;
let riqFile;

window.addEventListener("dragover", (e) => {
    if (videoUploadLabel.style.display == "none" && riqInputLabel.style.display == "none") return;

    const fileItems = [...e.dataTransfer.items].filter(
        (item) => item.kind === "file",
    );
    if (fileItems.length > 0) {
        e.preventDefault();
    }
});
window.addEventListener("drop", (e) => {
    if (videoUploadLabel.style.display == "none" && riqInputLabel.style.display == "none") return;

    if ([...e.dataTransfer.items].some((item) => item.kind === "file")) {
        e.preventDefault();
        if (videoUploadLabel.style.display != "none") {
            videoUpload.files = e.dataTransfer.files;
            videoUpload.onchange();
        } else if (riqInputLabel.style.display != "none") {
            riqInput.files = e.dataTransfer.files;
            riqInput.onchange();
        }
    }
});
//videoUpload.onchange = onVideoUpload;
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
compareLeftFrame.onchange = function (e) {
    const frame = e.target.value;
    getVideoFrame(videoFile, frame).then(url => {
        compareLeft.src = url;
    });
}
compareRightFrame.onchange = function (e) {
    const frame = e.target.value;
    getVideoFrame(videoFile, frame).then(url => {
        compareRight.src = url;
    });
}
differenceThreshold.onchange = updateTestDifference;
checkAllFramesInput.oninput = function () {
    const label = document.getElementById("checkLastLabel");
    label.style.display = "none";
    if (!checkAllFramesInput.checked) label.style.display = "block";
}

function validateVideo(file) {
    if (!file) return false;

    const fileName = file.name;
    const validTypes = ["mp4", "gif", "webm", "mov"];
    let correctType = false
    for (let i=0; i < validTypes.length; i++) {
        if (fileName.endsWith(validTypes[i])) {
            correctType = true;
            break;
        }
    }
    if (!correctType) return "Incorrect file type \n mp4 gif webm mov";
    return true
}

function validateRiq(file) {
    if (!file) return false;

    const fileName = file.name;
    const validTypes = ["riq"];
    let correctType = false
    for (let i=0; i < validTypes.length; i++) {
        if (fileName.endsWith(validTypes[i])) {
            correctType = true;
            break;
        }
    }
    if (!correctType) return "Incorrect file type \n riq";
    return true
}

function resizeVideoPreview() {
    const width = Math.max(parseInt(videoWidthInput.value), 1)
    const height = Math.max(parseInt(videoHeightInput.value), 1)
    //console.log(`${width} vs ${height}`)
    if (width > height) {
        //console.log("width maxxing")
        videoDiv.style.width = "70vmin";
        videoDiv.style.height = `${70 * (height/width)}vmin`;
    } else {
        //console.log("height maxxing")
        videoDiv.style.height = "70vmin";
        videoDiv.style.width = `${70 * (width/height)}vmin`;
    }
}

async function onVideoUpload() {
    let file = videoUpload.files[0];
    const validVideo = validateVideo(file);
    if (validVideo !== true) {
        if (validVideo) alert(validVideo);
        return;
    }

    if (file.name.endsWith("gif")) {
        file = await convertGifToVideo(file);
    }

    videoFile = file;
    //console.log(videoFile)
    videoPreview.src = URL.createObjectURL(videoFile);
    videoPreview.onloadeddata = async () => {
        videoFrameRate = await getFrameRate(videoFile);
        if (!videoFrameRate) {
            alert("This video is unsupported sorry \n I can\'t grab the frame rate");
            return;
        }
        toVideoEditor();
    };
}

function onRiqUpload() {
    generateRiqLabel.style.visibility = "hidden";
    const file = riqInput.files[0];

    validRiq = validateRiq(file);
    if (validRiq !== true) {
        if (validRiq) alert(validRiq);
        return;
    }

    riqFile = file;
    generateRiqLabel.style.visibility = "visible";
}

async function generateRiq() {
    riqOutput.style.visibility = "hidden";
    await loadRiq(riqFile, frameRate);
    riqOutput.style.visibility = "visible";
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
        videoOptionsDiv.style.display = "block";
        frameReuseDiv.style.display = "block";
        toDecalEditorLabel.style.display = "block";
        videoWidthInput.value = videoPreview.videoWidth;
        videoHeightInput.value = videoPreview.videoHeight;
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
        frameReuseDiv.animate([
            {transform: 'translateX(100%)'},
            {transform: 'translateX(0%)'},
        ],{
            duration: 500,
            iterations: 1,
            easing: "ease-out",
        });
        toDecalEditorLabel.animate([
            {transform: 'translateY(100%)'},
            {transform: 'translateY(0%)'},
        ],{
            duration: 500,
            iterations: 1,
            easing: "ease-out",
        });
        
    };

    getVideoFrame(videoFile, 0).then(url => {
        compareLeft.onload = updateTestDifference;
        compareLeft.src = url;
    });
    getVideoFrame(videoFile, 1).then(url => {
        compareRight.onload = updateTestDifference;
        compareRight.src = url;
    });
}

function toDecalEditor() {
    videoOptionsDiv.animate([
        {transform: 'translateX(0%)'},
        {transform: 'translateX(-100%)'},
    ],{
        duration: 500,
        iterations: 1,
        easing: "ease-out",
    });
    frameReuseDiv.animate([
        {transform: 'translateX(0%)'},
        {transform: 'translateX(100%)'},
    ],{
        duration: 500,
        iterations: 1,
        easing: "ease-out",
    });
    toDecalEditorLabel.animate([
        {transform: 'translateY(0%)'},
        {transform: 'translateY(100%)'},
    ],{
        duration: 500,
        iterations: 1,
        easing: "ease-out",
    });

    const anim = videoDiv.animate([
        {transform: 'scale(1)'},
        {transform: 'scale(0)'},
    ],{
        duration: 500,
        iterations: 1,
        easing: "ease-out",
    });
    
    anim.onfinish = async function() {
        videoWidth.style.display = "none";
        videoHeight.style.display = "none";
        videoDiv.style.display = "none";
        videoOptionsDiv.style.display = "none";
        frameReuseDiv.style.display = "none";
        toDecalEditorLabel.style.display = "none";

        const videoBlob = await (await fetch(videoPreview.src)).blob();
        await convertVideoToDecal(videoBlob, frameRate, isPNG.checked, jpgQualityValue.value, parseFloat(differenceThreshold.value)/100, checkAllFramesInput.checked ? Infinity : checkLastInput.value, parseInt(videoWidthInput.value), parseInt(videoHeightInput.value));
        riqOptions.style.display = "flex";
        editorOptionsDiv.style.display = "block";
    }
}

function setLoadProgress(percent, instant = false) {
    let difference = Math.abs(percent - loadFill.style.getPropertyValue("--fill"));
    percent = mid(0, percent, 1);
    loadFill.style.setProperty('--fill', percent);
    loadFill.style.setProperty('transition', `--fill ${instant ? 0 : difference * 4}s linear`);
}

function setLoaderText(text) {
    document.getElementById("loaderText").textContent = text;
}

function hideLoadProgress() {
    setLoadProgress(0);
    loader.style.display = "none";
}

function showLoadProgress(text = "") {
    loader.style.display = "block";
    loader.animate([
        {transform: 'scale(0)'},
        {transform: 'scale(1)'},
    ],{
        duration: 500,
        iterations: 1,
        easing: "ease-out",
    });
    setLoaderText(text);
}

function updateTestDifference() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", {willReadFrequently: true});
    ctx.imageSmoothingEnabled = false;
    canvas.width = 64;
    canvas.height = 64;

    ctx.drawImage(compareLeft, 0, 0, canvas.width, canvas.height);
    const dataLeft = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(compareRight, 0, 0, canvas.width, canvas.height);
    const dataRight = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    const diff = calculateDifferenceScore(dataLeft, dataRight);
    if (diff * 100 < parseFloat(differenceThreshold.value)) {
        frameReuseTestResult.textContent = 'Same image';
    } else {
        frameReuseTestResult.textContent = 'Different image';
    }
    frameReuseTestResult.textContent += ` ${Math.floor(diff * 10000)/100}%`
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

try {
    MediaInfo.mediaInfoFactory({
        locateFile: (path) => {
            return "scripts/MediaInfoModule.wasm";
        }
    }, (result) => {
        mediaInfo = result;
        console.log(result);
    });
} catch (error) {
    if (error instanceof ReferenceError) {
        alert("Failed to connect to Unpkg.com\nplease refresh the page and try again");
    }
}
