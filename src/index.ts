#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "node:module";
// import {version } from '../package.json' assert { type: 'json' };
import build from "./build";

const require = createRequire(import.meta.url);
const version = require("../package.json").version;

const program = new Command();

program
  .name("smpb")
  .description("A simple blog application")
  .version(version);

// build 子命令
program
  .command('build')
  .description('Build the project')
  .action(() => {
    // console.log('Building...');
    // 你的构建逻辑
    build();
  });

// publish 子命令
program
  .command('publish')
  .description('Publish the project')
  .action(() => {
    console.log('Publishing...');
    // 你的发布逻辑
  });

program.parse(process.argv);
