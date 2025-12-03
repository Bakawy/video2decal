//import {mid, convertGifToVideo} from "/helper.js";

const videoUpload = document.getElementById("videoUpload");
const videoUploadLabel = document.getElementById("videoUploadLabel");
const videoPreview = document.getElementById("videoPreview");
const loadFill = document.getElementById("loadFill");
const loader = document.getElementById("loader")
let videoFile;

videoUpload.onchange = onVideoUpload;

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
    anim.onfinish = () => {
        videoUploadLabel.style.display = "none";
        videoPreview.style.display = "flex";
        videoPreview.animate([
            {transform: 'scale(0)'},
            {transform: 'scale(1)'},
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