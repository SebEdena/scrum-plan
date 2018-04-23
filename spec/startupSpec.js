const electronPath = require('electron');
const Application = require('spectron').Application;
const path = require('path');

let app = null;

xdescribe("A started app", function() {

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
        let cb = jasmine.createSpy("timerCallback");
        setTimeout(()=> {
            cb();
        }, 10000);
        return app.client.waitUntilWindowLoaded(5000)
        .then(()=>{
            expect(cb).not.toHaveBeenCalled();
        })
        .catch(err=>{
            fail(err);
        });
    });

    it('shows an initial window', ()=>{
        return app.client.waitUntilWindowLoaded().then(()=>{
            app.client.getWindowCount().then(count => {
                expect(count).toBe(1);
            });
        });
    });

    it('should show a loading screen', ()=>{
        return app.client.isExisting("#connection_status").then(exists=>{
            expect(exists).toBe(true);
        });
    });
});
