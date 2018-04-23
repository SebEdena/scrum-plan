const electronPath = require('electron');
const Application = require('spectron').Application;
const path = require('path');

let app = null, app_dist = null, fe = null, fe_dist = null;

describe("A project", ()=>{

    beforeAll(async()=>{
        app = new Application({
            path: electronPath,
            args: [path.join(__dirname, '..')]
        });
        return await app.start();
    });

    beforeAll(async()=>{
        // fe = app.client;
        // fe_dist = app_dist.client;
        return await app.client.waitForExist("#welcome");
    });

    afterAll(function () {
        if (app && app.isRunning()) {
            return app.stop();
        }
    });

    it('should have the correct data', ()=>{
        return app.client.click('.lead #open').then(async()=>{
            expect(await app.client.getText("#pj1 #title")).toBe('Honda Works');
            expect(await app.client.getText("#pj1 #title")).toBe('A Honda engine that finally works');
        });
    });
});
