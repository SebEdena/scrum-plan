const electronPath = require('electron');
const Application = require('spectron').Application;
const path = require('path');

let app = null, fe = null;

xdescribe("An app on the home page", function() {

    beforeAll(()=>{
        app = new Application({
            path: electronPath,
            args: [path.join(__dirname, '..')]
        });
        return app.start();
    });

    beforeAll(async()=>{
        fe = app.client;
        return await fe.waitForExist('#welcome');
    });

    afterAll(function () {
        if (app && app.isRunning()) {
            return app.stop();
        }
    });

    it('should display the welcome message, the open and the new buttons', ()=>{
        return fe.waitForExist('#welcome_txt').then(exists=>{
            expect(exists).toBe(true);
            fe.elements(".lead #open").then(tab=>{
                expect(tab.value.length).toBe(1);
            });
            fe.elements(".lead #create").then(tab=>{
                expect(tab.value.length).toBe(1);
            });
        });
    });

    it('opens the Open Project menu when the user clicks on the Open button', ()=>{
        return fe.click('.lead #open').then(()=>{
            return fe.waitUntil(async ()=>{
                return ~((await fe.$("body").getAttribute("class"))
                .indexOf("modal-open"));
            }).then(async()=>{
                expect(~(await fe.getAttribute("#modal_open_project", "class"))
                .indexOf("show")).not.toBe(-1);
                expect((await fe.$$("#modal_open_project .project")).length).toBeGreaterThanOrEqual(1);
            });
        }).then(()=>{
            setTimeout(async()=>{
                await fe.click("#modal_open_project button")
                .catch((err)=>{
                    fail(err);
                });
            }, 2000);
        });
    });

    it('opens the New Project menu when the user clicks on the New button', ()=>{
        return fe.refresh().catch(err=>{
            console.log(err);
        })
        .then(()=>{
            console.log("done");
            return fe.click('.lead #create').then(()=>{
                return fe.waitUntil(async ()=>{
                    return ~(((await fe.getAttribute("class")))
                    .indexOf("modal-open"));
                }).then(async ()=>{
                    expect(~((await fe.getAttribute("#modal_create_project", "class"))
                    .indexOf("show"))).not.toBe(-1);
                    let form = await fe.$("#html_create_project #create_pj_form");
                    // expect(form.length).toBe(1);
                    expect((await form.$("#input_pj_name")).length).toBe(1);
                    expect((await form.$("#input_pj_desc")).length).toBe(1);
                    expect((await form.$("#create_submit")).length).toBe(1);
                });
            });
        }).then(()=>{
            setTimeout(()=>{
                return fe.click("#modal_create_project button")
                .catch((err)=>{
                    fail(err);
                });
            }, 1000);
        }).catch(err=>{
            console.log(err);
        });
    });

});
