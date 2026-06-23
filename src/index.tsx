#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import App from "./components/App.js";

// Deep link: `repotato open <slug>` lands directly on that product.
const argv = process.argv.slice(2);
const initialSlug = argv[0] === "open" && argv[1] ? argv[1] : undefined;

render(<App initialSlug={initialSlug} />);
