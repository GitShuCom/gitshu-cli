#! /usr/bin/env node

var Q = require("q");
var _ = require("lodash");
var path = require("path");
var program = require('commander');
var parsedArgv = require('optimist').argv;
var color = require('bash-color');

var pkg = require("../package.json");
var config = require("../lib/config");
var versions = require("../lib/versions");
var commands = require("../lib/commands");

function runPromise(p) {
    return p
    .then(function() {
        process.exit(0);
    }, function(err) {
        console.log("");
        console.log(color.red(err.toString()));
        if (program.debug || process.env.DEBUG) console.log(err.stack || "");
        process.exit(1);
    });
}


// Init gitbook-cli
config.init();

program
    .version(pkg.version)
    .option('-v, --gitshu [version]', 'specify GitShu version to use')
    .option('-d, --debug', 'enable verbose error');


program
    .command('versions')
    .description('list installed versions')
    .action(function(){
        var _versions = versions.list();

        if (_versions.length > 0) {
            console.log('GitShu Versions Installed:');
            console.log('');
            _.each(_versions,function(v) {
                var text = v.tag;
                if (v.link) text = text + ' (-> ' + v.link+' = '+v.version+')';

                console.log('   ', v.latest? '*' : ' ', text);
            });
            console.log('');
        } else {
            console.log('There is no versions installed');
            console.log('You can install the latest version using: "gitshu versions:install latest"');
        }
    });

program
    .command('versions:print')
    .description('print current version to use in the current directory')
    .action(function(){
        runPromise(
            versions.current(program.gitbook)
            .then(function(v) {
                console.log("GitShu version is", v.tag, (v.tag != v.version? '('+v.version+')' : ''));
            })
        );
    });

program
    .command('versions:available')
    .description('list available versions on NPM')
    .action(function(){
        runPromise(
            versions.available()
            .then(function(available) {
                console.log('Available GitShu Versions:');
                console.log('');
                console.log('    ', available.versions.join(", "));
                console.log('');
                console.log('Tags:');
                console.log('');
                _.each(available.tags, function(version, tagName) {
                    console.log('    ', tagName, ":", version);
                });
                console.log('');
            })
        );
    });

program
    .command('versions:install [version]')
    .description('force install a specific version of gitshu')
    .action(function(version){
        version = version || "*";

        runPromise(
            versions.install(version)
            .then(function(installedVersion) {
                console.log("");
                console.log(color.green("GitShu "+installedVersion+" has been installed"));
            })
        );
    });

program
    .command('versions:link [folder] [version]')
    .description('link a version to a local folder')
    .action(function(folder, version) {
        folder = path.resolve(folder || process.cwd());
        version = version || 'latest';

        runPromise(
            versions.link(version, folder)
            .then(function() {
                console.log("");
                console.log(color.green("GitShu "+version+" point to "+folder));
            })
        );
    });

program
    .command('versions:uninstall [version]')
    .description('uninstall a specific version of gitshu')
    .action(function(version){
        runPromise(
            versions.uninstall(version)
            .then(function() {
                console.log("");
                console.log(color.green("GitShu "+version+" has been uninstalled"));
            })
        );
    });

program
    .command('versions:update [tag]')
    .description('update to the latest version of gitshu')
    .action(function(tag){
        runPromise(
            versions.update(tag)
            .then(function(version) {
                if (!version) {
                    console.log("No update found!");
                } else {
                    console.log("");
                    console.log(color.green("GitShu has been updated to "+version));
                }
            })
        );
    });

program
    .command('help')
    .description('list commands for a specific version of gitshu')
    .action(function(){
        runPromise(
            versions.get(program.gitbook)
            .get("commands")
            .then(commands.help)
        );
    });

program
    .command('*')
    .description('run a command with a specific gitshu version')
    .action(function(commandName){
        var args = parsedArgv._.slice(1);
        var kwargs = _.omit(parsedArgv, '$0', '_');

        runPromise(
            versions.get(program.gitbook)
            .then(function(gitbook) {
                return commands.exec(gitbook.commands, commandName, args, kwargs);
            })
        );
    });

// Parse and fallback to help if no args
if(_.isEmpty(program.parse(process.argv).args) && process.argv.length === 2) {
    program.help();
}
