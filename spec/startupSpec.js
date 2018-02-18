const electronPath = require('electron');
const Application = require('spectron').Application;
const path = require('path');

let app = null;

describe("A started app", function() {

    beforeAll(function () {
        app = new Application({
            path: electronPath,
            args: [path.join(__dirname, '..')]
        });
        return app.start();
    });

    afterAll(function () {
        if (app && app.isRunning()) {
            return app.stop()
        }
    })

    it('should have its window loading', ()=>{
        expect(app.isRunning()).toBe(true);
    });

    it('shows an initial window', ()=>{
        app.webContents.once('dom-ready', ()=>{
        app
        .getWindowCount().then(count => {
            // expect(count).toBe(1);
            expect(count).toBe(2);
        })
    });
    });
});
