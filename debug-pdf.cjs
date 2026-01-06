const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('d:/Coding/PROJECTS/ACTIVE/TransGpa/assets/transcript.pdf');

pdf(dataBuffer).then(function(data) {
    console.log("EXTRACTED TEXT START");
    console.log(data.text);
    console.log("EXTRACTED TEXT END");
}).catch(function(error){
    console.error(error);
});
