const packager = require('electron-packager');
let src="src", dest="app", db="db/settings/settings_local.json";

let packagerOpts = {
    "win32-ia32": {
        dir: ".",
        arch: "ia32",
        platform: "win32",
        asar: true,
        prune: true,
        packageManager: "yarn",
        out: "release-builds",
        overwrite: true,
        name: "scrum-assistant",
        icon: "scrum.ico",
        executableName: "Scrum Assistant",
        ignore: [
            "db/server_side",
            "db/settings",
            "spec",
            "src",
            ".gitignore",
            "gruntfile.js",
            "package-lock.json",
            "settings.json",
            "yarn.lock"
        ]
    }
};

module.exports = (grunt) => {

    grunt.initConfig({
        build_dest: null,
        copy: {
            app:{
                expand: true,
                cwd: src + '/img',
                src: ['**/*.jpg', '**/*.png', '!nok.png', '!ok.png'],
                dest: dest + '/img'
            },
            dev_spec: {
                expand:true,
                src: db,
                dest: '.',
                rename: function(){ return 'settings.json' }
            },
            build_spec:{
                expand: true,
                src: db,
                dest: grunt.option('build_dest') + "/settings.json",
                rename: function(){ return grunt.option('build_dest')
                        + "/settings.json"; }
            }
        },
        htmlmin: {
            app: {
                files: [{
                    expand: true,
                    cwd: src + '/html',
                    src: ['**/*.html'],
                    dest: dest + '/html'
                }]
            }
        },
        cssmin: {
            app: {
                files: [{
                    expand: true,
                    cwd: src + '/css',
                    src: ['**/*.css'],
                    dest: dest + '/css'
                }]
            }
        },
        browserify: {
            app: {
                src: [src + '/build/front_modules.js'],
                dest: dest + '/js/bundle.js',
                options: {
                    transform: ['uglifyify']
                }
            }
        },
        uglify: {
            app: {
                files: [{
                    expand: true,
                    cwd: src + '/js',
                    src: ['**/*.js',],
                    dest: dest + '/js'
                }]
            }
        },
        shell: {
            'build-win': {command: 'npm run package-win'}
        }
    });

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify-es');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('default', ['copy:app', 'htmlmin', 'cssmin', 'browserify', 'uglify']);
    grunt.registerTask('dev', ['default', 'copy:dev_spec']);

    grunt.registerTask('build', function(platform, arch){
        if(platform == null || arch == null){
            grunt.fail.fatal("Missing target platform and/or arch");
        }
        grunt.task.run('default');
        grunt.task.run('package-app:' + platform + ':' + arch);
    });

    grunt.registerTask('package-app', function(platform, arch){
        if(platform == null || arch == null){
            grunt.fail.fatal("Missing target platform and/or arch");
        }
        if(!packagerOpts.hasOwnProperty(platform + '-' + arch)){
            grunt.fail.fatal("Such a platform and arch combination is not available");
        }
        let done = this.async();
        packager(packagerOpts[platform + '-' + arch], function(err, appPaths){
            if(err){
                grunt.log.writeln(err);
                done(false);
            }else{
                appPaths.forEach(function(path){
                    grunt.option('build_dest', path);
                    grunt.task.run("copy:build_spec");
                });
                done(true);
            }
        });
    });
}
