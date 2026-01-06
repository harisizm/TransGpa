import fs from 'fs';
import pdf from 'pdf-parse';

let dataBuffer = fs.readFileSync('transcript.pdf');

pdf(dataBuffer).then(function(data) {
    console.log("EXTRACTED TEXT START");
    console.log(data.text);
    console.log("EXTRACTED TEXT END");
}).catch(function(error){
    console.log(error);
})
