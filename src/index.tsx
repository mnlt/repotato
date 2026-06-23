#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import App from "./components/App.js";
import { runInstall } from "./install.js";

const argv = process.argv.slice(2);

// `repotato install` sets up the /repotato slash command, then exits.
if (argv[0] === "install") {
  runInstall();
  process.exit(0);
}

// Deep link: `repotato open <slug>` lands directly on that product.
const initialSlug = argv[0] === "open" && argv[1] ? argv[1] : undefined;

render(<App initialSlug={initialSlug} />);
