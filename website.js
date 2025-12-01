const videoUpload = document.getElementById("videoUpload");

function onVideoUpload(event) {
    alert("file uploaded")
}

videoUpload.addEventListener("change", onVideoUpload)