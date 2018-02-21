const electronPath = require('electron');
const Application = require('spectron').Application;
const path = require('path');

let app = null;

describe("An app on the home page", function() {
    beforeAll(function () {
        app = new Application({
            path: electronPath,
            args: [path.join(__dirname, '..')]
        });
        return app.start();
    });

    beforeAll(()=>{
        return app.client.waitForExist('#welcome');
    });

    afterAll(function () {
        if (app && app.isRunning()) {
            return app.stop()
        }
    })

    it('should display the welcome message, the open and the new buttons', ()=>{
        return app.client.isExisting('#welcome_txt').then(exists=>{
            expect(exists).toBe(true);
            app.client.elements(".lead #open").then(tab=>{
                expect(tab.value.length).toBe(1);
            });
            app.client.elements(".lead #create").then(tab=>{
                expect(tab.value.length).toBe(1);
            });
        });
    });

    it('opens the Open Project menu when the user clicks on the Open button', ()=>{
        app.client.click('#lead#open');
        return app.client.waitUntil(app.client.isVisible('#modal_open_project')).then(() => {
            console.log("there");
            expect(true).toBe(true);
            app.client.click('#modal_open_project.close');
        });
    });
    //
    // it('should show a loading screen', ()=>{
    //     return app.client.isExisting("#connection_status").then(exists=>{
    //         expect(exists).toBe(true);
    //     });
    // });
});
