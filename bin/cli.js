#!/usr/bin/env node

/*
 * ybuild, a tool for building YUI components.
 * https://github.com/mosen/ybuild
 *
 * See http://yuilibrary.com for more information about the YUI framework.
 */

var path        = require('path')
    , fs        = require('fs')
    , nopt      = require('nopt')
    , pkginfo   = require('pkginfo')(module)
    , winston   = require('winston') // Required because we are superseding buildy's logging behaviour.
    , Component = require('../lib/component.js').Component
    , queues    = require('../lib/queues.js')
    , knownOpts = { "help"      : Boolean
                  , "verbosity" : Number
                  , "recursive" : Boolean
                  , "buildfile" : String
                  , "colorize"  : Boolean
                  , "watch"     : Boolean
    }
    , shortHands = { "h" : ["--help"]
                   , "v" : ["--verbosity", "warn"]
                   , "vv" : ["--verbosity", "info"]
                   , "vvv" : ["--verbosity", "verbose"]
                   , "w" : ["--watch"]
                   , "r" : ["--recursive"]
                   , "f" : ["--buildfile"]
                   , "c" : ["--colorize"]
    }
    , parsed = nopt(knownOpts, shortHands, process.argv, 2)
    , buildDirs = parsed.argv.remain
    , logger = new (winston.Logger)()
    , header = "ybuild " + module.exports.version
    , usage = [
        "usage: ybuild [options] <dirname ...>",
        "",
        "options:",
        "  -h, --help            Display this help message",
//        "  -r, --recursive       Search recursively for components to build",
        "  -v, -vv, -vvv         Verbosity level (Warnings, Info, Verbose) (default Info)",
        "  -f, --buildfile       Use this filename to read build options (default \"build.json\")",
        "  -c, --color           Colorize the console output",
        "  -w, --watch           Watch for file changes and rebuild",
        ""
    ].join('\n');

console.log(header);

if (parsed.help || parsed.argv.remain.length == 0) {
    console.log(usage);
    process.exit(1);
}

// The default verbosity is to include info, warnings and errors. Info is strictly for relevant information
// and should have minimal output.
parsed.verbosity = parsed.verbosity || 'info';
logger.add(winston.transports.Console, { colorize: (parsed.colorize === true), level: parsed.verbosity });

parsed.buildfile = parsed.buildfile || "build.json";

if (parsed.recursive) {
    // recurse into subdirectories, looking for buildFileName
    console.log('Recursive option not yet supported.')
} else {
    buildDirs.forEach(function(dir) {
       var buildFilePath = path.join(dir, parsed.buildfile);

       path.exists(buildFilePath, function(exists) {
           if (exists) {
                if (parsed.watch === true) {
                    watchComponent(buildFilePath);
                } else {
                    buildComponent(buildFilePath);
                }
           } else {
               logger.log('warn', 'Couldn\'t find a build file at ' + buildFilePath + ', skipping...');
           }
       });
    }, this);
}

function buildComponent(buildFile) {
    var taskQueues = [],
        component = Component(buildFile);
        queueOpts = {
            logger: logger
        };

    logger.log('info', 'Building ' + component.component + '...');

    taskQueues.push(queues._createSourceQueue(component, queueOpts));

    if (component.skinnable) {
        taskQueues.push(queues._createSkinsQueue(component, queueOpts));
        taskQueues.push(queues._createAssetsQueue(component, queueOpts));
    }

    taskQueues.forEach(function each_queue(moduleQueue) {
       moduleQueue.run();
    }, this);
}

function watchComponent(buildFile) {
    var component = Component(buildFile);

    logger.log('info', 'Watching ' + component.component + '...');

    // Watch JS files
    component.sourcefiles.forEach(watchFile);

    // Watch assets
    watchDir(component.assets);

    // Watch build file
    watchFile(buildFile);
}

function watchFile(file) {
    // TODO test if exist
    fs.watch(file, function() {
        // TODO
        // see https://github.com/jashkenas/coffee-script/blob/master/src/command.coffee
    });
}

function watchDir(dir) {
    // TODO test if exist
    fs.watch(dir, function() {

    });

}
