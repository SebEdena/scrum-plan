const electronPath = require('electron');
const Application = require('spectron').Application;
const path = require('path');

let app = new Application({
    path: electronPath,
    args: [path.join(__dirname, '../..')]
});

app.start().then(()=>{
    return app.stop();
});
