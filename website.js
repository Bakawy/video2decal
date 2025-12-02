const videoUpload = document.getElementById("videoUpload");
const videoUploadLabel = document.getElementById("videoUploadLabel");
const videoPreview = document.getElementById("videoPreview");
let videoFile;

videoUpload.onchange = onVideoUpload;

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


function onVideoUpload(event) {
    const validVideo = validateVideo(event)
    if (validVideo !== true) {
        if (validVideo) alert(validVideo);
        return;
    }
    videoFile = event.target.files[0];
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